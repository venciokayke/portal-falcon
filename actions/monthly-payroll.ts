"use server";

import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/utils/calculatePayroll";
import { getGlobalRates } from "@/actions/config";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Busca os registros do MonthlyPayroll para o mês/ano. Retorna [] se não gerados ainda.
export async function getMonthlyPayrolls(month: number, year: number) {
  const records = await prisma.monthlyPayroll.findMany({
    where: { 
      month, 
      year,
      OR: [
        { isPaid: true },
        { employee: { isActive: true } }
      ]
    },
    include: {
      employee: {
        select: {
          name: true,
          registrationCompany: true,
          pixKey: true,
          pixType: true,
          paymentMethod: true,
          bankName: true,
          bankAgency: true,
          bankAccount: true,
          receivesVT: true,
          contractType: true,
        },
      },
      approvedBy: {
        select: { name: true },
      },
    },
    orderBy: {
      employee: { name: "asc" },
    },
  });

  return records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    name: r.employee.name,
    registrationCompany: r.employee.registrationCompany,
    pixKey: r.employee.pixKey,
    pixType: r.employee.pixType,
    paymentMethod: r.employee.paymentMethod,
    bankName: r.employee.bankName,
    bankAgency: r.employee.bankAgency,
    bankAccount: r.employee.bankAccount,
    receivesVT: r.employee.receivesVT,
    contractType: r.employee.contractType,
    baseValue: Number(r.baseValue),
    extras: Number(r.extras),
    vtValue: Number(r.vtValue),
    discounts: Number(r.discounts),
    total: Number(r.total),
    observations: r.observations ?? "",
    isPaid: r.isPaid,
    paidAt: r.paidAt?.toISOString() ?? null,
    approvedBy: r.approvedBy?.name ?? null,
    approvedAt: r.approvedAt?.toISOString() ?? null,
  }));
}

// Gera a prévia do mês: cria registros em MonthlyPayroll para todos os funcionários ativos
// usando valores pré-calculados. Idempotente: não duplica se já existir.
export async function generateMonthPreview(month: number, year: number) {
  const startDate = new Date(Date.UTC(year, month, 1));
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const endDate = new Date(Date.UTC(nextYear, nextMonth, 1));

  const [employees, globalRates] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: {
        shifts: {
          where: {
            referenceDate: { gte: startDate, lt: endDate },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    getGlobalRates(),
  ]);

  for (const emp of employees) {
    const payroll = calculatePayroll(emp, emp.shifts, month, year, globalRates.extraHourRate);

    let baseValue = 0;
    if (emp.contractType === "PJ_FIXO") {
      baseValue = Number(emp.baseSalary) || 0;
    } else if (emp.contractType === "CLT") {
      const rate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.extraHourRate;
      baseValue = rate * 220;
    } else {
      const rate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.workedHourRate;
      baseValue = rate * payroll.totalWorkedHours;
    }

    const extras = payroll.extraValue || 0;
    const vtValue = payroll.suggestedVT || 0;
    const total = baseValue + extras + vtValue;

    // upsert: cria se não existir, ignora se já existir
    await prisma.monthlyPayroll.upsert({
      where: {
        employeeId_month_year: {
          employeeId: emp.id,
          month,
          year,
        },
      },
      update: {}, // Não sobrescreve edições manuais existentes
      create: {
        employeeId: emp.id,
        month,
        year,
        baseValue,
        extras,
        vtValue,
        discounts: 0,
        total,
        observations: "",
        isPaid: false,
      },
    });
  }

  revalidatePath("/folha");
}

// Salva alterações nos valores de uma linha (extras, descontos, observações)
export async function saveMonthlyPayrollRow(
  id: string,
  data: { extras: number; discounts: number; observations: string; baseValue: number }
) {
  const total = data.baseValue + data.extras - data.discounts;

  await prisma.monthlyPayroll.update({
    where: { id },
    data: {
      baseValue: data.baseValue,
      extras: data.extras,
      discounts: data.discounts,
      total,
      observations: data.observations,
    },
  });

  revalidatePath("/folha");
}

// Salva todas as linhas de uma vez (botão "Salvar Alterações" global)
export async function saveAllMonthlyPayrolls(
  rows: { id: string; baseValue: number; extras: number; vtValue: number; discounts: number; observations: string }[]
) {
  for (const row of rows) {
    const total = row.baseValue + row.extras + row.vtValue - row.discounts;
    await prisma.monthlyPayroll.update({
      where: { id: row.id },
      data: {
        baseValue: row.baseValue,
        extras: row.extras,
        vtValue: row.vtValue,
        discounts: row.discounts,
        total,
        observations: row.observations,
      },
    });
  }

  revalidatePath("/folha");
}

// Marca/desmarca um registro como pago (com auditoria: quem aprovou e quando)
export async function togglePaymentStatus(id: string, isPaid: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const approver = await prisma.systemUser.findFirst({
    where: { username: (session.user as any).username },
  });

  await prisma.monthlyPayroll.update({
    where: { id },
    data: {
      isPaid,
      paidAt: isPaid ? new Date() : null,
      approvedById: isPaid ? (approver?.id ?? null) : null,
      approvedAt: isPaid ? new Date() : null,
    },
  });

  revalidatePath("/folha");
}

"use server";

import { requirePermission, requireRole } from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { calculateEmployeeMonth, syncCalculatedOvertime, requireDraft, validateAmounts } from "@/lib/payroll-calculation";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity-log";

// Busca os registros do MonthlyPayroll para o mês/ano. Retorna [] se não gerados ainda.
export async function getMonthlyPayrolls(month: number, year: number) {
  await requirePermission("MANAGE_PAYROLL");
  const records = await prisma.monthlyPayroll.findMany({
    where: { 
      month, 
      year,
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
  await requirePermission("MANAGE_PAYROLL");
  await prisma.$transaction(async tx => {
    const status = await tx.payrollStatus.findUnique({ where: { month_year: { month, year } } });
    if (status && status.status !== 'EM_DIGITACAO') throw new Error('Reabra a competência antes de gerar a prévia.');
    const employees = await tx.employee.findMany({ where: { isActive: true }, select: { id: true } });
    for (const { id } of employees) {
      const existing = await tx.monthlyPayroll.findUnique({ where: { employeeId_month_year: { employeeId: id, month, year } } });
      if (existing?.isPaid) continue;
      const { employee, result, rate } = await calculateEmployeeMonth(tx, id, month, year);
      const fixed = employee.contractType === 'CLT' || employee.contractType === 'PJ_FIXO';
      if (fixed && Number(employee.baseSalary) <= 0) throw new Error('Configure o salário-base de ' + employee.name);
      const baseValue = fixed ? Number(employee.baseSalary) : Number((rate * result.totalWorkedHours).toFixed(2));
      const vtValue = result.suggestedVT;
      const total = Number((baseValue + vtValue + Number(existing?.extras ?? 0) - Number(existing?.discounts ?? 0)).toFixed(2));
      validateAmounts(total);
      await tx.monthlyPayroll.upsert({
        where: { employeeId_month_year: { employeeId: id, month, year } }, update: { baseValue, vtValue, total },
        create: { employeeId: id, month, year, baseValue, vtValue, extras: 0, discounts: 0, total: baseValue + vtValue },
      });
      await syncCalculatedOvertime(tx, id, month, year);
    }
  }, { isolationLevel: 'Serializable', timeout: 20000 });

  await logActivity("GERAR_PREVIA_FOLHA", `Prévia gerada para ${month}/${year}`);
  revalidatePath("/folha");
}

// Salva alterações nos valores de uma linha (extras, descontos, observações)
export async function saveMonthlyPayrollRow(
  id: string,
  data: { extras: number; discounts: number; observations: string; baseValue: number }
) {
  await requirePermission("MANAGE_PAYROLL");
  validateAmounts(data.baseValue, data.extras, data.discounts);
  await prisma.$transaction(async tx => {
    const saved = await tx.monthlyPayroll.findUniqueOrThrow({ where: { id } });
    await requireDraft(tx, saved.month, saved.year);
    const total = Number((data.baseValue + data.extras + Number(saved.vtValue) - data.discounts).toFixed(2));
    validateAmounts(total);
    await tx.monthlyPayroll.update({ where: { id, isPaid: false }, data: { baseValue: data.baseValue, extras: data.extras, discounts: data.discounts, observations: data.observations, total } });
  }, { isolationLevel: 'Serializable' });

  revalidatePath("/folha");
}

// Salva todas as linhas de uma vez (botão "Salvar Alterações" global)
export async function saveAllMonthlyPayrolls(
  rows: { id: string; baseValue: number; extras: number; vtValue: number; discounts: number; observations: string }[]
) {
  await requirePermission("MANAGE_PAYROLL");
  await prisma.$transaction(async tx => {
    for (const row of rows) {
      validateAmounts(row.baseValue, row.extras, row.vtValue, row.discounts);
      const saved = await tx.monthlyPayroll.findUniqueOrThrow({ where: { id: row.id } });
      await requireDraft(tx, saved.month, saved.year);
      const total = Number((row.baseValue + row.extras + row.vtValue - row.discounts).toFixed(2));
      validateAmounts(total);
      await tx.monthlyPayroll.update({ where: { id: row.id, isPaid: false }, data: { baseValue: row.baseValue, extras: row.extras, vtValue: row.vtValue, discounts: row.discounts, total, observations: row.observations } });
    }
  }, { isolationLevel: 'Serializable' });

  await logActivity("SALVAR_FECHAMENTO_FOLHA", `Linhas alteradas: ${rows.length}`);
  revalidatePath("/folha");
}

// Marca/desmarca um registro como pago (com auditoria: quem aprovou e quando)
export async function togglePaymentStatus(id: string, isPaid: boolean) {
  const approver = await requireRole("ADMIN", "MANAGER");
  if (typeof isPaid !== "boolean") throw new Error("Status inválido.");

  await prisma.monthlyPayroll.update({
    where: { id },
    data: {
      isPaid,
      paidAt: isPaid ? new Date() : null,
      approvedById: isPaid ? (approver?.id ?? null) : null,
      approvedAt: isPaid ? new Date() : null,
    },
  });

  await logActivity("TOGGLE_PAGAMENTO_FOLHA", `Pagamento ${isPaid ? "realizado" : "cancelado"} | Linha ID: ${id}`);
  revalidatePath("/folha");
}

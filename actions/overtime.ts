"use server";

import { prisma } from "@/lib/prisma";
import { getGlobalRates } from "@/actions/config";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logActivity } from "@/actions/activity-log";
import { calculatePayroll } from "@/utils/calculatePayroll";

export async function getOvertimeData(month: number, year: number) {
  const records = await prisma.overtimeEntry.findMany({
    where: { 
      month, 
      year,
    },
    include: {
      employee: {
        select: {
          name: true,
          registrationCompany: true,
          contractType: true,
          hourlyRate: true,
          baseSalary: true,
        }
      },
      approvedBy: {
        select: { name: true }
      }
    },
    orderBy: {
      employee: { name: "asc" }
    }
  });

  const globalRates = await getGlobalRates();

  return records.map(r => {
    const emp = r.employee;
    let effectiveRate = 0;
    
    if (emp.contractType === "CLT") {
      effectiveRate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.extraHourRate;
    } else {
      effectiveRate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.workedHourRate;
    }

    return {
      id: r.id,
      employeeId: r.employeeId,
      name: emp.name,
      registrationCompany: emp.registrationCompany,
      contractType: emp.contractType,
      effectiveRate,
      hours: Number(r.hours),
      extraValue: Number(r.extraValue),
      totalValue: Number(r.totalValue),
      observations: r.observations ?? "",
      status: r.status,
      approvedBy: r.approvedBy?.name ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
    };
  });
}

export async function generateOvertimePreview(month: number, year: number) {
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
        absenceExemptions: true,
      }
    }),
    getGlobalRates(),
  ]);

  for (const emp of employees) {
    const payroll = calculatePayroll(emp as any, emp.shifts as any, month, year, globalRates.extraHourRate);

    const isCLT = emp.contractType === "CLT";

    await prisma.overtimeEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: emp.id,
          month,
          year,
        }
      },
      update: {}, // Não sobrescreve edições já feitas
      create: {
        employeeId: emp.id,
        month,
        year,
        hours: isCLT ? (payroll.extraHoursBalance || 0) : 0,
        extraValue: 0,
        totalValue: isCLT ? (payroll.extraValue || 0) : 0,
        observations: "",
        status: "PENDENTE",
      }
    });
  }
  revalidatePath("/horas-extras");
}

export async function saveOvertimeRecords(rows: { id: string, hours: number, extraValue: number, totalValue: number, observations: string }[]) {
  for (const row of rows) {
    await prisma.overtimeEntry.update({
      where: { id: row.id },
      data: {
        hours: row.hours,
        extraValue: row.extraValue,
        totalValue: row.totalValue,
        observations: row.observations,
      }
    });
  }
  await logActivity("SALVAR_HORAS_EXTRAS", `Linhas alteradas: ${rows.length}`);
  revalidatePath("/horas-extras");
}

export async function toggleOvertimeStatus(id: string, newStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const approver = await prisma.systemUser.findFirst({
    where: { username: (session.user as any).username },
  });

  const isPaid = newStatus === "PAGO";

  await prisma.overtimeEntry.update({
    where: { id },
    data: { 
      status: newStatus,
      approvedById: isPaid ? (approver?.id ?? null) : null,
      approvedAt: isPaid ? new Date() : null,
    }
  });
  
  await logActivity("TOGGLE_PAGAMENTO_EXTRA", `Status alterado para ${newStatus} | Linha ID: ${id}`);
  revalidatePath("/horas-extras");
}

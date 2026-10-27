"use server";

import { requirePermission, requireRole } from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { getGlobalRates } from "@/actions/config";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity-log";
import { syncCalculatedOvertime, calculateEmployeeMonth, requireDraft, validateAmounts } from "@/lib/payroll-calculation";

export async function getOvertimeData(month: number, year: number) {
  await requirePermission("MANAGE_SHIFTS");
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
      intervalValue: Number(r.intervalValue),
      observations: r.observations ?? "",
      status: r.status,
      approvedBy: r.approvedBy?.name ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
    };
  });
}

export async function generateOvertimePreview(month: number, year: number) {
  await requirePermission("MANAGE_SHIFTS");
  await prisma.$transaction(async tx => {
    const employees = await tx.employee.findMany({ where: { isActive: true }, select: { id: true } });
    for (const employee of employees) await syncCalculatedOvertime(tx, employee.id, month, year);
  }, { isolationLevel: 'Serializable', timeout: 20000 });
  revalidatePath("/horas-extras");
}

export async function saveOvertimeRecords(rows: { id: string, hours: number, extraValue: number, totalValue: number, observations: string }[]) {
  await requirePermission("MANAGE_SHIFTS");
  await prisma.$transaction(async tx => {
    for (const row of rows) {
      validateAmounts(row.hours, row.extraValue);
      const saved = await tx.overtimeEntry.findUniqueOrThrow({ where: { id: row.id } });
      await requireDraft(tx, saved.month, saved.year);
      const { rate, result } = await calculateEmployeeMonth(tx, saved.employeeId, saved.month, saved.year);
      const totalValue = Number((row.hours * rate + row.extraValue + result.intervalValue).toFixed(2));
      validateAmounts(totalValue);
      await tx.overtimeEntry.update({ where: { id: row.id, status: 'PENDENTE' }, data: { hours: row.hours, extraValue: row.extraValue, intervalValue: result.intervalValue, totalValue, observations: row.observations } });
    }
  }, { isolationLevel: 'Serializable' });
  await logActivity("SALVAR_HORAS_EXTRAS", `Linhas alteradas: ${rows.length}`);
  revalidatePath("/horas-extras");
}

export async function toggleOvertimeStatus(id: string, newStatus: string) {
  const approver = await requireRole("ADMIN", "MANAGER");
  if (newStatus !== "PAGO" && newStatus !== "PENDENTE") throw new Error("Status inválido.");

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

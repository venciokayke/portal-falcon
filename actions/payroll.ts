"use server";

import { requirePermission } from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/utils/calculatePayroll";
import { getGlobalRates } from "@/actions/config";
import { requireDraft, validateAmounts } from "@/lib/payroll-calculation";
import { revalidatePath } from "next/cache";

export async function getPayrollData(month: number, year: number) {
  await requirePermission("MANAGE_PAYROLL");
  const startDate = new Date(Date.UTC(year, month, 1));
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const endDate = new Date(Date.UTC(nextYear, nextMonth, 1));

  const [employees, savedReceipts, globalRates] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: {
        shifts: {
          where: { referenceDate: { gte: startDate, lt: endDate } }
        },
        absenceExemptions: { select: { startDate: true, endDate: true } },
        monthParities: { where: { month, year } },
      },
      orderBy: { name: "asc" }
    }),
    prisma.payrollReceipt.findMany({ where: { month, year } }),
    getGlobalRates(),
  ]);

  const savedMap = new Map();
  savedReceipts.forEach(r => savedMap.set(r.employeeId, r));

  return employees.map(emp => {
    const payroll = calculatePayroll({ ...emp, startParity: emp.monthParities[0]?.startParity ?? emp.startParity }, emp.shifts, month, year, emp.contractType === "CLT" ? globalRates.extraHourRate : globalRates.workedHourRate);
    
    let contraCheque = 0;
    if (emp.contractType === "PJ_FIXO") {
      contraCheque = Number(emp.baseSalary) || 0;
    } else if (emp.contractType === "CLT") {
      contraCheque = Number(emp.baseSalary) || 0;
    } else {
      // HORISTA / PJ_HORISTA / NAO_REGISTRADO: taxa global de hora trabalhada
      const rate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.workedHourRate;
      contraCheque = rate * payroll.totalWorkedHours;
    }

    const saved = savedMap.get(emp.id);

    return {
      employeeId: emp.id,
      name: emp.name,
      registrationCompany: emp.registrationCompany,
      pixKey: emp.pixKey,
      pixType: emp.pixType,
      receivesVT: emp.receivesVT,
      absences: payroll.currentMonthAbsences,
      contraCheque: saved ? Number(saved.contraCheque) : Number(contraCheque.toFixed(2)),
      valeTransporte: saved ? Number(saved.valeTransporte) : payroll.suggestedVT,
      valoresExtras: saved ? Number(saved.valoresExtras) : 0,
      descontos: saved ? Number(saved.descontos) : 0,
      observacoes: saved ? saved.observacoes : "",
      expectedDaysNextMonth: payroll.expectedDaysNextMonth
    };
  });
}

export async function savePayrollReceipts(month: number, year: number, receipts: any[]) {
  await requirePermission("MANAGE_PAYROLL");
  const dataToInsert = receipts.map(r => {
    validateAmounts(r.contraCheque, r.valeTransporte, r.valoresExtras, r.descontos);
    const total = Number((r.contraCheque + r.valeTransporte + r.valoresExtras - r.descontos).toFixed(2));
    validateAmounts(total);
    return { employeeId: r.employeeId, month, year, contraCheque: r.contraCheque, valeTransporte: r.valeTransporte, valoresExtras: r.valoresExtras, descontos: r.descontos, observacoes: r.observacoes, total };
  });
  await prisma.$transaction(async tx => {
    await requireDraft(tx, month, year);
    if (await tx.monthlyPayroll.count({ where: { month, year, isPaid: true } })) throw new Error('Competencia com pagamentos realizados.');
    await tx.payrollReceipt.deleteMany({ where: { month, year } });
    await tx.payrollReceipt.createMany({ data: dataToInsert });
  }, { isolationLevel: 'Serializable' });

  revalidatePath("/folha");
}

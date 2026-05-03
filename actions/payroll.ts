"use server";

import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/utils/calculatePayroll";
import { revalidatePath } from "next/cache";

export async function getPayrollData(month: number, year: number) {
  const startDate = new Date(Date.UTC(year, month, 1));
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const endDate = new Date(Date.UTC(nextYear, nextMonth, 1));

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      shifts: {
        where: {
          referenceDate: {
            gte: startDate,
            lt: endDate,
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  // Também podemos buscar se já existe um fechamento salvo para esse mês, mas
  // para simplificar e garantir dados vivos da função utilitária sempre que a tela abrir,
  // recarregamos os cálculos dinâmicos. (Opcional: mesclar com o PayrollReceipt salvo).
  // Vamos buscar os salvos para priorizar a edição manual!
  const savedReceipts = await prisma.payrollReceipt.findMany({
    where: { month, year }
  });

  const savedMap = new Map();
  savedReceipts.forEach(r => savedMap.set(r.employeeId, r));

  return employees.map(emp => {
    const payroll = calculatePayroll(emp, emp.shifts, month, year);
    
    let contraCheque = 0;
    if (emp.contractType === "PJ_FIXO") {
      contraCheque = Number(emp.baseSalary) || 0;
    } else if (emp.contractType === "CLT") {
      contraCheque = Number(emp.hourlyRate) * 220; 
    } else {
      contraCheque = Number(emp.hourlyRate) * payroll.totalWorkedHours;
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
      valoresExtras: saved ? Number(saved.valoresExtras) : payroll.extraValue,
      descontos: saved ? Number(saved.descontos) : 0,
      observacoes: saved ? saved.observacoes : "",
      expectedDaysNextMonth: payroll.expectedDaysNextMonth
    };
  });
}

export async function savePayrollReceipts(month: number, year: number, receipts: any[]) {
  // Remove os recibos atuais deste mês para substituir
  await prisma.payrollReceipt.deleteMany({
    where: { month, year }
  });

  const dataToInsert = receipts.map(r => ({
    employeeId: r.employeeId,
    month,
    year,
    contraCheque: r.contraCheque,
    valeTransporte: r.valeTransporte,
    valoresExtras: r.valoresExtras,
    descontos: r.descontos,
    observacoes: r.observacoes,
    total: r.total,
  }));

  await prisma.payrollReceipt.createMany({
    data: dataToInsert
  });

  revalidatePath("/folha");
}

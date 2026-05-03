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
    
    // Calcula um contra-cheque base padrão caso não haja salvo
    let netSalaryAccounting = 0;
    if (emp.contractType === "CLT") {
      netSalaryAccounting = Number(emp.hourlyRate) * 220; 
    } else {
      netSalaryAccounting = Number(emp.hourlyRate) * payroll.totalWorkedHours;
    }

    const saved = savedMap.get(emp.id);

    return {
      employeeId: emp.id,
      name: emp.name,
      pixKey: emp.pixKey,
      pixType: emp.pixType,
      receivesVA: emp.receivesVA,
      receivesVT: emp.receivesVT,
      // Se tiver salvo no banco, usamos os dados salvos (para preservar edições manuais),
      // Senão usamos o cálculo fresquinho do util.
      absences: payroll.currentMonthAbsences, // Faltas a gente sempre traz do util pra referência (ou do salvo)
      netSalaryAccounting: saved ? Number(saved.netSalaryAccounting) : Number(netSalaryAccounting.toFixed(2)),
      vaTotal: saved ? Number(saved.vaTotal) : payroll.suggestedVA,
      vtTotal: saved ? Number(saved.vtTotal) : payroll.suggestedVT,
      extraHoursTotalValue: saved ? Number(saved.extraHoursTotalValue) : payroll.extraValue,
      manualAdditions: saved ? Number(saved.manualAdditions) : 0,
      manualDeductions: saved ? Number(saved.manualDeductions) : 0,
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
    netSalaryAccounting: r.netSalaryAccounting,
    extraHoursTotalValue: r.extraHoursTotalValue,
    vaTotal: r.vaTotal,
    vtTotal: r.vtTotal,
    manualAdditions: r.manualAdditions,
    manualDeductions: r.manualDeductions,
    finalAmount: r.finalAmount,
  }));

  await prisma.payrollReceipt.createMany({
    data: dataToInsert
  });

  revalidatePath("/folha");
}

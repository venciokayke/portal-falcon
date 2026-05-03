import { Employee, Shift, StartParity, WorkSchedule } from "@prisma/client";
import { differenceInMinutes, getDaysInMonth, isWeekend } from "date-fns";

export type PayrollResult = {
  baseHours: number;
  totalWorkedHours: number;
  intervalHoursAdded: number;
  extraHoursBalance: number;
  extraValue: number;
  currentMonthAbsences: number;
  expectedDaysCurrentMonth: number;
  expectedDaysNextMonth: number;
  suggestedVA: number;
  suggestedVT: number;
};

/**
 * Retorna os dias esperados de trabalho no mês baseado na escala.
 * Para SCALE_12X36, avalia os dias pares/ímpares do mês.
 * Para FIXED_220, avalia os dias úteis padrão.
 */
function getExpectedWorkDays(
  year: number,
  month: number, // 0-indexed
  workSchedule: WorkSchedule,
  startParity: StartParity
): number {
  const daysInMonth = getDaysInMonth(new Date(year, month));
  
  if (workSchedule === "SCALE_12X36") {
    let expectedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const isEven = day % 2 === 0;
      if (startParity === "PAR" && isEven) expectedDays++;
      if (startParity === "IMPAR" && !isEven) expectedDays++;
    }
    return expectedDays;
  }
  
  // Para FIXED_220 (escala normal), usamos dias úteis (Segunda a Sexta) como padrão simplificado.
  let expectedDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (!isWeekend(date)) expectedDays++;
  }
  return expectedDays;
}

export function calculatePayroll(
  employee: Employee,
  shifts: Shift[],
  month: number, // 0-indexed (0 = Jan, 11 = Dez)
  year: number
): PayrollResult {
  // 1. Horas Base Dinâmicas
  const expectedDaysCurrentMonth = getExpectedWorkDays(year, month, employee.workSchedule, employee.startParity);
  
  let baseHours = 220; // Padrão
  if (employee.workSchedule === "SCALE_12X36") {
    baseHours = expectedDaysCurrentMonth * 12;
  } else if (employee.workSchedule === "CUSTOM") {
    baseHours = 0; // Depende de regras customizadas
  }

  // 2. Horas Trabalhadas e Intervalo
  let totalWorkedMinutes = 0;
  let intervalHoursAdded = 0;
  
  // Usamos um Set para contar os "Dias Trabalhados" únicos e evitar problemas 
  // se houver 2 turnos (antes e depois do almoço) no mesmo dia.
  const workedDaysSet = new Set<string>();

  for (const shift of shifts) {
    const minutes = differenceInMinutes(new Date(shift.checkOut), new Date(shift.checkIn));
    if (minutes > 0) {
      totalWorkedMinutes += minutes;
    }
    
    // Armazena a data lógica para saber que o funcionário compareceu naquele dia
    const dateString = new Date(shift.referenceDate).toISOString().split('T')[0];
    workedDaysSet.add(dateString);
  }

  let totalWorkedHours = totalWorkedMinutes / 60;

  // Se receivesIntervalHour for true, adicione +1h para cada Shift trabalhado
  if (employee.receivesIntervalHour) {
    intervalHoursAdded = shifts.length; // 1 hora por registro de turno
    totalWorkedHours += intervalHoursAdded;
  }

  // Saldo de Extras (Trabalhadas - baseHours)
  const extraHoursBalance = Math.max(0, totalWorkedHours - baseHours);
  // Valor extra = Saldo * 13.00
  const extraValue = extraHoursBalance * 13.00;

  // 3. Benefícios (VA/VT) com Faltas
  // Faltas = Dias Previstos do MÊS ATUAL menos os Dias Únicos Trabalhados (workedDaysSet.size)
  const currentMonthAbsences = Math.max(0, expectedDaysCurrentMonth - workedDaysSet.size);

  // Projeção para o próximo mês
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const expectedDaysNextMonth = getExpectedWorkDays(nextYear, nextMonth, employee.workSchedule, employee.startParity);

  // Valores diários (Zerados se o colaborador não receber o benefício)
  const baseVA = employee.receivesVA ? 26.00 : 0;
  const baseVT = employee.receivesVT ? 8.60 : 0;

  // suggested = (Projeção * Valor) - (Faltas * Valor)
  const suggestedVA = (expectedDaysNextMonth * baseVA) - (currentMonthAbsences * baseVA);
  const suggestedVT = (expectedDaysNextMonth * baseVT) - (currentMonthAbsences * baseVT);

  return {
    baseHours,
    totalWorkedHours: Number(totalWorkedHours.toFixed(2)),
    intervalHoursAdded,
    extraHoursBalance: Number(extraHoursBalance.toFixed(2)),
    extraValue: Number(extraValue.toFixed(2)),
    currentMonthAbsences,
    expectedDaysCurrentMonth,
    expectedDaysNextMonth,
    suggestedVA: Number(Math.max(0, suggestedVA).toFixed(2)),
    suggestedVT: Number(Math.max(0, suggestedVT).toFixed(2))
  };
}

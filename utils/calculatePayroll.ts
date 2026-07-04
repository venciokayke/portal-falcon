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

type ExemptionRange = { startDate: Date; endDate: Date };

/**
 * Retorna os dias esperados de trabalho no mês baseado na escala.
 * Para SCALE_12X36, avalia os dias pares/ímpares do mês.
 * Para FIXED_220, avalia os dias úteis padrão.
 */
function getExpectedWorkDays(
  year: number,
  month: number, // 0-indexed
  workSchedule: WorkSchedule,
  startParity: StartParity,
  exemptions: ExemptionRange[] = []
): number {
  if (workSchedule === "CUSTOM") {
    return 0; // Horistas e PJ não têm dias úteis fixos predefinidos, então não geram faltas
  }

  const isDayExempt = (dayNum: number) => {
    const targetDate = new Date(year, month, dayNum);
    const targetTime = targetDate.setHours(0,0,0,0);
    return exemptions.some(ex => {
      const start = new Date(ex.startDate);
      const end = new Date(ex.endDate);
      const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      return targetTime >= startTime && targetTime <= endTime;
    });
  };

  const daysInMonth = getDaysInMonth(new Date(year, month));
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  if (workSchedule === "SCALE_12X36") {
    let expectedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (isCurrentMonth && day > today.getDate()) break;
      if (isDayExempt(day)) continue; // Abona o dia / Período afastado
      const isEven = day % 2 === 0;
      if (startParity === "PAR" && isEven) expectedDays++;
      if (startParity === "IMPAR" && !isEven) expectedDays++;
    }
    return expectedDays;
  }
  
  // Para FIXED_220 (escala normal), usamos dias úteis (Segunda a Sexta) como padrão simplificado.
  let expectedDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (isCurrentMonth && day > today.getDate()) break;
    if (isDayExempt(day)) continue; // Abona o dia / Período afastado
    const date = new Date(year, month, day);
    if (!isWeekend(date)) expectedDays++;
  }
  return expectedDays;
}

export function calculatePayroll(
  employee: Employee & { absenceExemptions?: ExemptionRange[] },
  shifts: Shift[],
  month: number, // 0-indexed (0 = Jan, 11 = Dez)
  year: number,
  globalExtraHourRate: number = 13.00 // Taxa global; employee.hourlyRate sobrescreve se definida
): PayrollResult {
  const exemptions = employee.absenceExemptions || [];
  const effectiveExtraRate = employee.hourlyRate ? Number(employee.hourlyRate) : globalExtraHourRate;
  // 1. Horas Base Dinâmicas
  const expectedDaysCurrentMonth = getExpectedWorkDays(year, month, employee.workSchedule, employee.startParity, exemptions);

  
  let baseHours = 220; // Padrão
  if (employee.workSchedule === "SCALE_12X36") {
    baseHours = expectedDaysCurrentMonth * 12;
  } else if (employee.workSchedule === "CUSTOM") {
    baseHours = 0; // Depende de regras customizadas
  }

  // 2. Horas Trabalhadas e Intervalo
  let totalWorkedHours = 0;
  let intervalHoursAdded = 0;
  
  // Usamos um Set para contar os "Dias Trabalhados" únicos e evitar problemas 
  // se houver 2 turnos (antes e depois do almoço) no mesmo dia.
  const workedDaysSet = new Set<string>();

  for (const shift of shifts) {
    if (shift.checkIn && shift.checkOut) {
      const minutes = differenceInMinutes(shift.checkOut, shift.checkIn);
      if (minutes > 0) {
        totalWorkedHours += Math.round(minutes / 60);
      }
    }
    
    // Armazena a data lógica para saber que o funcionário compareceu naquele dia
    const dateString = new Date(shift.referenceDate).toISOString().split('T')[0];
    workedDaysSet.add(dateString);
  }

  // Se receivesIntervalHour for true, adicione +1h para cada Shift trabalhado
  if (employee.receivesIntervalHour) {
    intervalHoursAdded = shifts.length; // 1 hora por registro de turno
    totalWorkedHours += intervalHoursAdded;
  }

  // Saldo de Extras (Trabalhadas - baseHours)
  const extraHoursBalance = Math.max(0, totalWorkedHours - baseHours);
  // Valor extra = Saldo * taxa efetiva
  const extraValue = extraHoursBalance * effectiveExtraRate;

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
    totalWorkedHours,
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

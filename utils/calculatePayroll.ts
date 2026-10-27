import type { Employee, Shift } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE, logicalDate, workedMinutes } from "@/utils/shift-time";

type ExemptionRange = { startDate: Date; endDate: Date };
type PayrollEmployee = Pick<Employee, "workSchedule" | "startParity" | "receivesVA" | "receivesVT" | "receivesIntervalHour"> & {
  hourlyRate?: number | string | { toString(): string } | null;
  absenceExemptions?: ExemptionRange[];
};
type PayrollShift = Pick<Shift, "referenceDate" | "checkIn" | "checkOut"> & Partial<Pick<Shift, "breakStart" | "breakEnd" | "hasIntervalHour">>;

export function calculatePayroll(employee: PayrollEmployee, shifts: PayrollShift[], month: number, year: number, globalExtraHourRate = 13, asOf = new Date()) {
  if (!Number.isInteger(month) || month < 0 || month > 11 || !Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Competência inválida.");
  const today = formatInTimeZone(asOf, TIMEZONE, "yyyy-MM-dd");
  const isScheduled = (date: Date) => {
    if (employee.workSchedule === "CUSTOM") return false;
    if (employee.workSchedule === "SCALE_12X36") return employee.startParity === (date.getUTCDate() % 2 === 0 ? "PAR" : "IMPAR");
    return date.getUTCDay() !== 0 && date.getUTCDay() !== 6;
  };
  const dates = (m: number, y: number) => Array.from({ length: new Date(Date.UTC(y, m + 1, 0)).getUTCDate() }, (_, i) => new Date(Date.UTC(y, m, i + 1)));
  const scheduled = dates(month, year).filter(isScheduled);
  const workedDays = new Set<string>();
  const intervalDays = new Set<string>();
  let totalMinutes = 0;
  for (const shift of shifts) {
    if (shift.referenceDate.getUTCFullYear() !== year || shift.referenceDate.getUTCMonth() !== month) continue;
    const minutes = workedMinutes(shift);
    if (minutes <= 0) continue;
    totalMinutes += minutes;
    const day = shift.referenceDate.toISOString().slice(0, 10);
    workedDays.add(day);
    // Verba legada por dia, separada do tempo efetivamente trabalhado.
    if (employee.receivesIntervalHour && shift.hasIntervalHour !== false && !shift.breakStart && !shift.breakEnd) intervalDays.add(day);
  }
  const exemptions = employee.absenceExemptions ?? [];
  const currentMonthAbsences = scheduled.filter(date => {
    const day = date.toISOString().slice(0, 10);
    return day <= today && !workedDays.has(day) && !exemptions.some(ex => date >= logicalDate(ex.startDate.toISOString().slice(0, 10)) && date <= logicalDate(ex.endDate.toISOString().slice(0, 10)));
  }).length;
  const baseHours = employee.workSchedule === "CUSTOM" ? 0 : employee.workSchedule === "SCALE_12X36" ? scheduled.length * 12 : 220;
  const totalWorkedHours = totalMinutes / 60;
  const extraHoursBalance = Math.max(0, totalWorkedHours - baseHours);
  const rate = employee.hourlyRate == null ? globalExtraHourRate : Number(employee.hourlyRate);
  const next = new Date(Date.UTC(year, month + 1, 1));
  const expectedDaysNextMonth = dates(next.getUTCMonth(), next.getUTCFullYear()).filter(isScheduled).length;
  return {
    baseHours, totalWorkedHours, intervalHoursAdded: intervalDays.size,
    intervalValue: Number(((Math.max(0, totalWorkedHours + intervalDays.size - baseHours) - extraHoursBalance) * rate).toFixed(2)),
    extraHoursBalance, extraValue: Number((extraHoursBalance * rate).toFixed(2)),
    currentMonthAbsences, expectedDaysCurrentMonth: scheduled.length, expectedDaysNextMonth,
    // shortcut: diárias legadas; parametrizar por empresa antes do próximo cliente.
    suggestedVA: employee.receivesVA ? Number((Math.max(0, expectedDaysNextMonth - currentMonthAbsences) * 26).toFixed(2)) : 0,
    suggestedVT: employee.receivesVT ? Number((Math.max(0, expectedDaysNextMonth - currentMonthAbsences) * 8.6).toFixed(2)) : 0,
  };
}

export type PayrollResult = ReturnType<typeof calculatePayroll>;

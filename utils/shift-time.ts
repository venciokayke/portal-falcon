import { fromZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Sao_Paulo";

export function logicalDate(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Data inválida.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Data inválida.");
  return date;
}

function clock(value?: string | null) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Horário inválido.");
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export type ShiftClocks = { checkIn?: string | null; checkOut?: string | null; breakStart?: string | null; breakEnd?: string | null };

export function resolveShiftTimes(referenceDate: string, times: ShiftClocks) {
  const date = logicalDate(referenceDate);
  const start = clock(times.checkIn);
  let end = clock(times.checkOut);
  let pause = clock(times.breakStart);
  let resume = clock(times.breakEnd);
  if (start !== null && end !== null && end < start) end += 1440;
  if (pause !== null || resume !== null) {
    if (start === null) throw new Error("Informe a entrada antes do intervalo.");
    if (pause !== null && pause < start) pause += 1440;
    if (resume !== null && resume < start) resume += 1440;
    if (pause !== null && resume !== null && resume <= pause) throw new Error("O retorno deve ocorrer depois da saída para almoço.");
    if (end !== null && ((pause !== null && pause >= end) || (resume !== null && resume > end))) throw new Error("O almoço deve estar dentro do turno.");
  }
  if (start !== null && end !== null && end === start) throw new Error("Entrada e saída não podem ser iguais.");
  const asDate = (minutes: number | null) => {
    if (minutes === null) return null;
    const day = new Date(date.getTime() + Math.floor(minutes / 1440) * 86400000).toISOString().slice(0, 10);
    const hh = String(Math.floor(minutes % 1440 / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return fromZonedTime(`${day}T${hh}:${mm}:00`, TIMEZONE);
  };
  return { checkIn: asDate(start), checkOut: asDate(end), breakStart: asDate(pause), breakEnd: asDate(resume) };
}

export type ShiftDates = { checkIn: Date | null; checkOut: Date | null; breakStart?: Date | null; breakEnd?: Date | null };

export function workedMinutes(shift: ShiftDates) {
  if (!shift.checkIn || !shift.checkOut || !!shift.breakStart !== !!shift.breakEnd) return 0;
  const duration = (shift.checkOut.getTime() - shift.checkIn.getTime()) / 60000;
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440) return 0;
  if (!shift.breakStart || !shift.breakEnd) return duration;
  if (shift.breakStart < shift.checkIn || shift.breakEnd > shift.checkOut || shift.breakEnd <= shift.breakStart) return 0;
  return duration - (shift.breakEnd.getTime() - shift.breakStart.getTime()) / 60000;
}

export function formatHours(hours: number) {
  const minutes = Math.round(Math.abs(hours) * 60);
  return `${hours < 0 ? '-' : ''}${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

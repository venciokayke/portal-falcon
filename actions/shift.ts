"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logActivity } from "@/actions/activity-log";
import { formatInTimeZone } from "date-fns-tz";
import { logicalDate, resolveShiftTimes, TIMEZONE, type ShiftClocks } from "@/utils/shift-time";
import { calculateEmployeeMonth, syncCalculatedOvertime } from "@/lib/payroll-calculation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

type ShiftInput = ShiftClocks & { referenceDate: string; location: string; observations?: string | null };

function refresh(employeeId: string) {
  for (const route of ['/', '/folha', '/horas-extras', `/ponto/${employeeId}`]) revalidatePath(route);
}

async function checkOverlap(db: Prisma.TransactionClient, employeeId: string, shiftId: string, times: ReturnType<typeof resolveShiftTimes>) {
  if (!times.checkIn || !times.checkOut) return;
  const conflict = await db.shift.findFirst({ where: { employeeId, id: { not: shiftId }, checkIn: { lt: times.checkOut }, checkOut: { gt: times.checkIn } } });
  if (conflict) throw new Error("Este horário se sobrepõe a outro turno do colaborador.");
}

export async function saveShifts(employeeId: string, shifts: ShiftInput[]) {
  await requirePermission("MANAGE_SHIFTS");
  await prisma.$transaction(async tx => {
    const months = new Set<string>();
    for (const shift of shifts) {
      const referenceDate = logicalDate(shift.referenceDate);
      const times = resolveShiftTimes(shift.referenceDate, shift);
      const saved = await tx.shift.create({ data: { employeeId, referenceDate, location: shift.location, observations: shift.observations, ...times } });
      await checkOverlap(tx, employeeId, saved.id, times);
      months.add(`${referenceDate.getUTCFullYear()}-${referenceDate.getUTCMonth()}`);
    }
    for (const key of months) { const [year, month] = key.split('-').map(Number); await syncCalculatedOvertime(tx, employeeId, month, year); }
  }, { isolationLevel: 'Serializable' });
  await logActivity("SINCRONIZAR_PONTOS", `Funcionário: ${employeeId}`);
  refresh(employeeId);
}

export async function createEmptyShift(employeeId: string, referenceDate: string): Promise<string> {
  await requirePermission("MANAGE_SHIFTS");
  const shift = await prisma.shift.create({ data: { employeeId, referenceDate: logicalDate(referenceDate), location: "" } });
  await logActivity("CRIAR_PONTO_MANUAL", `Funcionário: ${employeeId} | Data: ${referenceDate}`);
  return shift.id;
}

export async function getShifts(employeeId: string, month: number, year: number) {
  await requirePermission("MANAGE_SHIFTS");
  const shifts = await prisma.shift.findMany({
    where: { employeeId, referenceDate: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) } },
    orderBy: [{ referenceDate: 'asc' }, { checkIn: 'asc' }],
  });
  const clock = (date: Date | null) => date ? formatInTimeZone(date, TIMEZONE, 'HH:mm') : '';
  return shifts.map(s => ({ id: s.id, referenceDate: s.referenceDate.toISOString(), location: s.location, checkIn: clock(s.checkIn), checkOut: clock(s.checkOut), breakStart: clock(s.breakStart), breakEnd: clock(s.breakEnd), observations: s.observations ?? '' }));
}

export async function getShiftMonthSummary(employeeId: string, month: number, year: number) {
  await requirePermission("MANAGE_SHIFTS");
  return (await calculateEmployeeMonth(prisma, employeeId, month, year)).result;
}

export async function deleteShift(shiftId: string) {
  await requirePermission("MANAGE_SHIFTS");
  const shift = await prisma.$transaction(async tx => {
    const deleted = await tx.shift.delete({ where: { id: shiftId } });
    await syncCalculatedOvertime(tx, deleted.employeeId, deleted.referenceDate.getUTCMonth(), deleted.referenceDate.getUTCFullYear());
    return deleted;
  }, { isolationLevel: 'Serializable' });
  await logActivity("EXCLUIR_PONTO", `Ponto: ${shiftId}`);
  refresh(shift.employeeId);
}

export async function updateSavedShift(shiftId: string, referenceDate: string, data: ShiftClocks & { location?: string; observations?: string | null }) {
  await requirePermission("MANAGE_SHIFTS");
  const employeeId = await prisma.$transaction(async tx => {
    const saved = await tx.shift.findUniqueOrThrow({ where: { id: shiftId } });
    if (saved.referenceDate.toISOString().slice(0, 10) !== referenceDate) throw new Error("A data do turno não confere.");
    const previous = (value: Date | null) => value ? formatInTimeZone(value, TIMEZONE, 'HH:mm') : null;
    const merged = { checkIn: previous(saved.checkIn), checkOut: previous(saved.checkOut), breakStart: previous(saved.breakStart), breakEnd: previous(saved.breakEnd), ...data };
    const times = resolveShiftTimes(referenceDate, merged);
    await checkOverlap(tx, saved.employeeId, shiftId, times);
    await tx.shift.update({ where: { id: shiftId }, data: { location: data.location, observations: data.observations, ...times } });
    await syncCalculatedOvertime(tx, saved.employeeId, saved.referenceDate.getUTCMonth(), saved.referenceDate.getUTCFullYear());
    return saved.employeeId;
  }, { isolationLevel: 'Serializable' });
  await logActivity("EDITAR_PONTO", `Ponto: ${shiftId} | Data: ${referenceDate}`);
  refresh(employeeId);
}

export async function updateEmployeeMonthParity(employeeId: string, month: number, year: number, startParity: "PAR" | "IMPAR" | "NONE") {
  await requirePermission("MANAGE_SHIFTS");
  if (!['PAR', 'IMPAR', 'NONE'].includes(startParity)) throw new Error("Paridade inválida.");
  await prisma.$transaction(async tx => {
    await tx.employeeMonthParity.upsert({ where: { employeeId_month_year: { employeeId, month, year } }, create: { employeeId, month, year, startParity }, update: { startParity } });
    await syncCalculatedOvertime(tx, employeeId, month, year);
  }, { isolationLevel: 'Serializable' });
  refresh(employeeId);
}

export async function getEmployeeMonthParity(employeeId: string, month: number, year: number) {
  await requirePermission("MANAGE_SHIFTS");
  return (await prisma.employeeMonthParity.findUnique({ where: { employeeId_month_year: { employeeId, month, year } } }))?.startParity ?? null;
}

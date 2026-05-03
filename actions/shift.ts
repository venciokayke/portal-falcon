"use server";

import { prisma } from "@/lib/prisma";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, setHours, setMinutes } from "date-fns";

const TIMEZONE = "America/Sao_Paulo";

type ShiftInput = {
  referenceDate: string; // "YYYY-MM-DD"
  location: string;
  checkIn: string; // "HH:mm"
  checkOut: string; // "HH:mm"
};

export async function saveShifts(employeeId: string, shifts: ShiftInput[]) {
  const operations = shifts.map(shift => {
    // 1. Create a logical date for the reference date in the timezone (Midnight)
    const baseDate = toZonedTime(new Date(`${shift.referenceDate}T00:00:00`), TIMEZONE);
    
    // Parse checkIn time
    const [inHours, inMinutes] = shift.checkIn.split(":").map(Number);
    const checkInDate = setMinutes(setHours(baseDate, inHours), inMinutes);
    
    // Parse checkOut time
    const [outHours, outMinutes] = shift.checkOut.split(":").map(Number);
    let checkOutDate = setMinutes(setHours(baseDate, outHours), outMinutes);
    
    // Regra de Ouro: Cruzando a meia-noite
    // Se a hora de saída for menor que a hora de entrada, significa que o turno virou a madrugada
    if (checkOutDate < checkInDate) {
      checkOutDate = addDays(checkOutDate, 1);
    }
    
    // Convert back to UTC for database storage
    const utcCheckIn = fromZonedTime(checkInDate, TIMEZONE);
    const utcCheckOut = fromZonedTime(checkOutDate, TIMEZONE);
    
    // Convert referenceDate string to a Date object at midnight UTC for logical storage
    const logicalReferenceDate = new Date(`${shift.referenceDate}T00:00:00Z`);

    return prisma.shift.create({
      data: {
        employeeId,
        referenceDate: logicalReferenceDate,
        location: shift.location,
        checkIn: utcCheckIn,
        checkOut: utcCheckOut,
      },
    });
  });

  // Execute all creations in a transaction
  await prisma.$transaction(operations);
}

export async function getShifts(employeeId: string, month: number, year: number) {
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const shifts = await prisma.shift.findMany({
    where: {
      employeeId,
      referenceDate: {
        gte: startDate,
        lte: endDate,
      }
    },
    orderBy: [
      { referenceDate: 'asc' },
      { checkIn: 'asc' }
    ]
  });

  // Import locally to avoid conflict if not in file top
  const { formatInTimeZone } = await import("date-fns-tz");

  return shifts.map(s => ({
    id: s.id,
    referenceDate: s.referenceDate.toISOString(), // safe serialization
    location: s.location,
    checkIn: formatInTimeZone(s.checkIn, TIMEZONE, "HH:mm"),
    checkOut: formatInTimeZone(s.checkOut, TIMEZONE, "HH:mm")
  }));
}

export async function deleteShift(shiftId: string) {
  await prisma.shift.delete({
    where: { id: shiftId }
  });
}

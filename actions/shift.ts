"use server";

import { prisma } from "@/lib/prisma";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { addDays, setHours, setMinutes } from "date-fns";

const TIMEZONE = "America/Sao_Paulo";

type ShiftInput = {
  referenceDate: string; // "YYYY-MM-DD"
  location: string;
  checkIn?: string | null; // "HH:mm"
  checkOut?: string | null; // "HH:mm"
};

export async function saveShifts(employeeId: string, shifts: ShiftInput[]) {
  const operations = shifts.map(shift => {
    // 1. Create a logical date for the reference date in the timezone (Midnight)
    const baseDate = toZonedTime(new Date(`${shift.referenceDate}T00:00:00`), TIMEZONE);
    
    let utcCheckIn = null;
    let utcCheckOut = null;

    if (shift.checkIn) {
      const [inHours, inMinutes] = shift.checkIn.split(":").map(Number);
      const checkInDate = setMinutes(setHours(baseDate, inHours), inMinutes);
      utcCheckIn = fromZonedTime(checkInDate, TIMEZONE);
    }
    
    if (shift.checkOut) {
      const [outHours, outMinutes] = shift.checkOut.split(":").map(Number);
      let checkOutDate = setMinutes(setHours(baseDate, outHours), outMinutes);
      
      // Regra de Ouro: Cruzando a meia-noite
      // Se a hora de saída for menor que a hora de entrada, significa que o turno virou a madrugada
      if (shift.checkIn) {
        const [inHours, inMinutes] = shift.checkIn.split(":").map(Number);
        const checkInDate = setMinutes(setHours(baseDate, inHours), inMinutes);
        if (checkOutDate < checkInDate) {
          checkOutDate = addDays(checkOutDate, 1);
        }
      }
      
      utcCheckOut = fromZonedTime(checkOutDate, TIMEZONE);
    }
    
    // Convert referenceDate string to a Date object at midnight UTC for logical storage
    const logicalReferenceDate = new Date(`${shift.referenceDate}T00:00:00Z`);

    return prisma.shift.create({
      data: {
        employee: { connect: { id: employeeId } },
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

export async function createEmptyShift(employeeId: string, referenceDate: string): Promise<string> {
  const logicalReferenceDate = new Date(`${referenceDate}T00:00:00Z`);
  const shift = await prisma.shift.create({
    data: {
      employee: { connect: { id: employeeId } },
      referenceDate: logicalReferenceDate,
      location: "",
      checkIn: null,
      checkOut: null,
    },
  });
  return shift.id;
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
    checkIn: s.checkIn ? formatInTimeZone(s.checkIn, TIMEZONE, "HH:mm") : "",
    checkOut: s.checkOut ? formatInTimeZone(s.checkOut, TIMEZONE, "HH:mm") : ""
  }));
}

export async function deleteShift(shiftId: string) {
  await prisma.shift.delete({
    where: { id: shiftId }
  });
}

export async function updateSavedShift(
  shiftId: string,
  referenceDate: string, // "YYYY-MM-DD" — needed to resolve midnight crossing
  data: { location?: string; checkIn?: string | null; checkOut?: string | null }
) {
  const { formatInTimeZone } = await import("date-fns-tz");
  const baseDate = toZonedTime(new Date(`${referenceDate}T00:00:00`), TIMEZONE);

  let utcCheckIn: Date | null | undefined = undefined; // undefined = don't update
  let utcCheckOut: Date | null | undefined = undefined;

  if ("checkIn" in data) {
    if (data.checkIn) {
      const [h, m] = data.checkIn.split(":").map(Number);
      utcCheckIn = fromZonedTime(setMinutes(setHours(baseDate, h), m), TIMEZONE);
    } else {
      utcCheckIn = null;
    }
  }

  if ("checkOut" in data) {
    if (data.checkOut) {
      const [h, m] = data.checkOut.split(":").map(Number);
      let checkOutDate = setMinutes(setHours(baseDate, h), m);
      if (data.checkIn) {
        const [ih, im] = data.checkIn.split(":").map(Number);
        const checkInDate = setMinutes(setHours(baseDate, ih), im);
        if (checkOutDate < checkInDate) checkOutDate = addDays(checkOutDate, 1);
      }
      utcCheckOut = fromZonedTime(checkOutDate, TIMEZONE);
    } else {
      utcCheckOut = null;
    }
  }

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      ...(data.location !== undefined && { location: data.location }),
      ...(utcCheckIn !== undefined && { checkIn: utcCheckIn }),
      ...(utcCheckOut !== undefined && { checkOut: utcCheckOut }),
    },
  });
}

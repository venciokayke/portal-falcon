const fs = require('fs');
const path = require('path');

const shiftPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'actions', 'shift.ts');

let content = fs.readFileSync(shiftPath, 'utf8');

const newActions = `
// ── Novas Ações da Fase 3 ────────────────────────────────────────────────────

export async function updateEmployeeMonthParity(employeeId: string, month: number, year: number, startParity: "PAR" | "IMPAR" | "NONE") {
  await prisma.employeeMonthParity.upsert({
    where: {
      employeeId_month_year: {
        employeeId,
        month,
        year
      }
    },
    create: { employeeId, month, year, startParity },
    update: { startParity }
  });
}

export async function syncOvertimeEntry(employeeId: string, month: number, year: number, hours: number, totalValue: number) {
  // Ignora sync se o status for PAGO (para não sobrescrever dados fechados)
  const existing = await prisma.overtimeEntry.findUnique({
    where: { employeeId_month_year: { employeeId, month, year } }
  });

  if (existing && existing.status === "PAGO") return;

  if (hours <= 0) {
    if (existing) {
      await prisma.overtimeEntry.delete({
        where: { id: existing.id }
      });
    }
    return;
  }

  await prisma.overtimeEntry.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    create: {
      employeeId,
      month,
      year,
      hours: hours.toFixed(2),
      totalValue: totalValue.toFixed(2),
      status: "PENDENTE"
    },
    update: {
      hours: hours.toFixed(2),
      totalValue: totalValue.toFixed(2)
    }
  });
}
`;

// Also update `updateSavedShift` and `getShifts` to handle `observations`.
// Add `observations` to `ShiftInput`
content = content.replace(
  '  checkOut?: string | null; // "HH:mm"',
  '  checkOut?: string | null; // "HH:mm"\n  observations?: string | null;'
);

// getShifts
content = content.replace(
  '    checkOut: s.checkOut ? formatInTimeZone(s.checkOut, TIMEZONE, "HH:mm") : ""',
  '    checkOut: s.checkOut ? formatInTimeZone(s.checkOut, TIMEZONE, "HH:mm") : "",\n    observations: s.observations || ""'
);

// updateSavedShift signature
content = content.replace(
  '  data: { location?: string; checkIn?: string | null; checkOut?: string | null }',
  '  data: { location?: string; checkIn?: string | null; checkOut?: string | null; observations?: string | null }'
);

// updateSavedShift body
content = content.replace(
  '      ...(utcCheckOut !== undefined && { checkOut: utcCheckOut }),',
  '      ...(utcCheckOut !== undefined && { checkOut: utcCheckOut }),\n      ...(data.observations !== undefined && { observations: data.observations }),'
);

fs.writeFileSync(shiftPath, content + newActions, 'utf8');
console.log('actions/shift.ts updated');

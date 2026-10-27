import type { Prisma } from "@prisma/client";
import { calculatePayroll } from "@/utils/calculatePayroll";

export async function requireDraft(db: Prisma.TransactionClient, month: number, year: number) {
  const status = await db.payrollStatus.findUnique({ where: { month_year: { month, year } } });
  if (status && status.status !== 'EM_DIGITACAO') throw new Error("Reabra a competência antes de editar os valores.");
}

export function validateAmounts(...amounts: number[]) {
  if (!amounts.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99999999.99)) throw new Error("Valores financeiros inválidos.");
}

export async function calculateEmployeeMonth(db: Prisma.TransactionClient, employeeId: string, month: number, year: number) {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    include: { shifts: { where: { referenceDate: { gte: start, lt: end } } }, absenceExemptions: { select: { startDate: true, endDate: true } }, monthParities: { where: { month, year } } },
  });
  const configs = await db.systemConfig.findMany({ where: { key: { in: ['extra_hour_rate', 'worked_hour_rate'] } } });
  const rates = Object.fromEntries(configs.map(c => [c.key, Number(c.value)]));
  const rate = employee.hourlyRate == null ? (rates[employee.contractType === 'CLT' ? 'extra_hour_rate' : 'worked_hour_rate'] ?? 13) : Number(employee.hourlyRate);
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Taxa de hora inválida.");
  const result = calculatePayroll({ ...employee, startParity: employee.monthParities[0]?.startParity ?? employee.startParity }, employee.shifts, month, year, rate);
  return { employee, result, rate };
}

export async function syncCalculatedOvertime(db: Prisma.TransactionClient, employeeId: string, month: number, year: number) {
  const existing = await db.overtimeEntry.findUnique({ where: { employeeId_month_year: { employeeId, month, year } } });
  const status = await db.payrollStatus.findUnique({ where: { month_year: { month, year } } });
  if (existing?.status === 'PAGO' || (status && status.status !== 'EM_DIGITACAO')) return;
  const { employee, result, rate } = await calculateEmployeeMonth(db, employeeId, month, year);
  // Salários fixos e horas normais pertencem à folha, não a pagamentos extras.
  const hours = employee.contractType === 'CLT' ? result.extraHoursBalance : 0;
  const totalValue = Number((hours * rate + result.intervalValue + Number(existing?.extraValue ?? 0)).toFixed(2));
  await db.overtimeEntry.upsert({
    where: { employeeId_month_year: { employeeId, month, year } },
    create: { employeeId, month, year, hours, totalValue, intervalValue: result.intervalValue },
    update: { hours, totalValue, intervalValue: result.intervalValue },
  });
}

const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? '');
  if (!['/falcon_ci', '/falcon_test'].includes(database.pathname)) throw new Error('Use apenas um banco descartável falcon_ci ou falcon_test.');
  const db = new PrismaClient();
  const rollback = new Error('rollback-test-fixtures');
  try {
    await assert.rejects(db.$transaction(async tx => {
      const employee = await tx.employee.create({ data: { name: `Test ${randomUUID()}`, contractType: 'CLT', workSchedule: 'FIXED_220', startParity: 'NONE' } });
      const shift = await tx.shift.create({ data: { employeeId: employee.id, location: 'Teste', referenceDate: new Date('2026-01-02'), checkIn: new Date('2026-01-02T11:00:00Z'), checkOut: new Date('2026-01-02T20:00:00Z'), breakStart: new Date('2026-01-02T15:00:00Z'), breakEnd: new Date('2026-01-02T16:00:00Z') } });
      assert.equal(shift.breakEnd.toISOString(), '2026-01-02T16:00:00.000Z');
      const data = Buffer.from('%PDF-1.7\nfixture');
      const exemption = await tx.absenceExemption.create({ data: { employeeId: employee.id, startDate: new Date('2026-01-03'), endDate: new Date('2026-01-03'), reason: 'Teste', attachmentName: 'test.pdf', attachmentMime: 'application/pdf', attachmentData: data } });
      const saved = await tx.absenceExemption.findUniqueOrThrow({ where: { id: exemption.id } });
      assert.deepEqual(Buffer.from(saved.attachmentData), data);
      assert.equal((await tx.employee.findUniqueOrThrow({ where: { id: employee.id }, include: { absenceExemptions: true, monthParities: true } })).absenceExemptions.length, 1);
      await tx.payrollStatus.findMany({ take: 1 });
      await tx.monthlyReportConfig.findMany({ take: 1 });
      await tx.activityLog.findMany({ take: 1 });
      throw rollback;
    }, { timeout: 20000 }), error => error === rollback);
    console.log('Migrações, almoço e anexo em PostgreSQL: OK (fixtures revertidas).');
  } finally { await db.$disconnect(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

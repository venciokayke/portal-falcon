const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./test-support.cjs');

const load = harness().load;
const { resolveShiftTimes, workedMinutes, formatHours, logicalDate } = load('utils/shift-time.ts');
const { calculatePayroll } = load('utils/calculatePayroll.ts');
const { validateCertificate } = load('lib/medical-certificate.ts');
const employee = { workSchedule: 'CUSTOM', startParity: 'NONE', receivesVA: false, receivesVT: false, receivesIntervalHour: false, hourlyRate: 13 };
const shift = (day, times) => ({ referenceDate: logicalDate(day), ...resolveShiftTimes(day, times) });

test('almoço diurno e noturno descontam minutos exatos', () => {
  const day = shift('2026-01-02', { checkIn: '08:00', checkOut: '17:20', breakStart: '12:00', breakEnd: '13:00' });
  const night = shift('2026-01-03', { checkIn: '19:00', checkOut: '07:00', breakStart: '00:30', breakEnd: '01:30' });
  assert.equal(workedMinutes(day), 500);
  assert.equal(formatHours(workedMinutes(day) / 60), '8:20');
  assert.equal(workedMinutes(night), 660);
  assert.equal(day.checkIn.toISOString(), '2026-01-02T11:00:00.000Z');
  assert.equal(night.breakStart.toISOString(), '2026-01-04T03:30:00.000Z');
});

test('alterar só a saída preserva a virada noturna e datas não dependem do fuso do host', () => {
  const saved = { checkIn: '19:00', checkOut: '06:00' };
  const updated = resolveShiftTimes('2026-01-02', { ...saved, checkOut: '07:00' });
  assert.equal(updated.checkOut.toISOString(), '2026-01-03T10:00:00.000Z');
  for (const value of ['2026-02-30', '2026-13-01', 'not-a-date']) assert.throws(() => logicalDate(value));
  for (const times of [
    { checkIn: '25:00' },
    { checkIn: '08:00', checkOut: '17:00', breakStart: '18:00', breakEnd: '19:00' },
    { checkIn: '08:00', checkOut: '17:00', breakStart: '13:00', breakEnd: '12:00' },
  ]) assert.throws(() => resolveShiftTimes('2026-01-02', times));
});

test('intervalo incompleto não apura horas e legado não recebe desconto presumido', () => {
  assert.equal(workedMinutes(shift('2026-01-02', { checkIn: '08:00', checkOut: '17:00', breakStart: '12:00' })), 0);
  assert.equal(workedMinutes(shift('2026-01-02', { checkIn: '08:00', checkOut: '17:00' })), 540);
});

test('três turnos de 8h20 somam 25h e R$325; janeiro não usa dados de fevereiro', () => {
  const shifts = [2, 3, 4].map(day => shift(`2026-01-0${day}`, { checkIn: '08:00', checkOut: '16:20' }));
  shifts.push(shift('2026-02-02', { checkIn: '08:00', checkOut: '16:00' }));
  const result = calculatePayroll(employee, shifts, 0, 2026);
  assert.equal(result.totalWorkedHours, 25);
  assert.equal(result.extraValue, 325);
});

test('ponto vazio não abona presença e atestado conta a data UTC correta', () => {
  const fixed = { ...employee, workSchedule: 'FIXED_220', receivesVT: true };
  const empty = { referenceDate: logicalDate('2026-01-02'), checkIn: null, checkOut: null };
  const asOf = new Date('2026-01-02T15:00:00Z');
  assert.equal(calculatePayroll(fixed, [empty], 0, 2026, 13, asOf).currentMonthAbsences, 2);
  const exempt = { ...fixed, absenceExemptions: [{ startDate: logicalDate('2026-01-02'), endDate: logicalDate('2026-01-02') }] };
  assert.equal(calculatePayroll(exempt, [empty], 0, 2026, 13, asOf).currentMonthAbsences, 1);
  assert.equal(calculatePayroll(fixed, [], 11, 2026, 13, asOf).currentMonthAbsences, 0);
});

test('verba intervalar não infla horas reais nem duplica no mesmo dia', () => {
  const first = shift('2026-01-02', { checkIn: '08:00', checkOut: '12:00' });
  const second = shift('2026-01-02', { checkIn: '13:00', checkOut: '17:00' });
  const result = calculatePayroll({ ...employee, receivesIntervalHour: true }, [first, second], 0, 2026);
  assert.equal(result.totalWorkedHours, 8);
  assert.equal(result.intervalHoursAdded, 1);
  assert.equal(result.intervalValue, 13);
  const fixed = calculatePayroll({ ...employee, workSchedule: 'FIXED_220', receivesIntervalHour: true }, [first, second], 0, 2026);
  assert.equal(fixed.intervalValue, 0, 'preserva o crédito intervalar legado sem inventar pagamento abaixo da base');
});

test('upload valida assinatura, extensão, MIME e tamanho', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\ncontent');
  assert.equal(validateCertificate('atestado.pdf', 'application/pdf', pdf), 'atestado.pdf');
  assert.throws(() => validateCertificate('atestado.pdf', 'application/pdf', new Uint8Array([1, 2, 3])));
  assert.throws(() => validateCertificate('atestado.exe', 'application/pdf', pdf));
  assert.throws(() => validateCertificate('atestado.pdf', 'text/html', pdf));
  assert.throws(() => validateCertificate('atestado.pdf', 'application/pdf', new Uint8Array(5 * 1024 * 1024 + 1)));
  assert.throws(() => validateCertificate('atestado.pdf', 'application/pdf', new Uint8Array()));
});

test('upload inválido não grava abono e documento válido é persistido com o autor', async () => {
  const { load, state, prisma } = harness();
  state.user.permissions = ['MANAGE_SHIFTS'];
  state.login();
  prisma.absenceExemption = { create: async args => { state.writes.push(args); } };
  const action = load('actions/employee.ts').addAbsenceExemption;
  const bad = new FormData();
  bad.set('file', new File(['<html>'], 'atestado.pdf', { type: 'application/pdf' }));
  await assert.rejects(() => action('emp', '2026-01-02', '2026-01-02', 'Atestado', bad), /arquivo PDF/);
  assert.equal(state.writes.length, 0);
  const good = new FormData();
  good.set('file', new File(['%PDF-1.7\nfixture'], 'atestado.pdf', { type: 'application/pdf' }));
  await action('emp', '2026-01-02', '2026-01-03', 'Atestado', good);
  assert.equal(state.writes[0].data.uploadedById, 'actor');
  assert.equal(state.writes[0].data.attachmentName, 'atestado.pdf');
  assert.equal(state.writes[0].data.endDate.toISOString(), '2026-01-03T00:00:00.000Z');
});

test('edição parcial usa a entrada salva e recusa sobreposição', async () => {
  const { load, state, prisma } = harness();
  state.user.permissions = ['MANAGE_SHIFTS'];
  state.login();
  const saved = { ...shift('2026-01-02', { checkIn: '19:00', checkOut: '06:00' }), employeeId: 'emp' };
  let conflict = null;
  prisma.$transaction = async callback => callback(prisma);
  prisma.shift = {
    findUniqueOrThrow: async () => saved,
    findFirst: async () => conflict,
    update: async args => { state.writes.push(args); },
  };
  prisma.overtimeEntry.findUnique = async () => ({ status: 'PAGO' });
  prisma.payrollStatus.findUnique = async () => null;
  const action = load('actions/shift.ts').updateSavedShift;
  await action('row', '2026-01-02', { checkOut: '07:00' });
  assert.equal(state.writes[0].data.checkOut.toISOString(), '2026-01-03T10:00:00.000Z');
  conflict = { id: 'other' };
  await assert.rejects(() => action('row', '2026-01-02', { checkOut: '07:00' }), /sobrepõe/);
  assert.equal(state.writes.length, 1);
});

test('download não expõe documento sem permissão e envia anexo privado', async () => {
  const { load, prisma, state } = harness();
  const route = load('app/api/atestados/[id]/route.ts');
  const params = Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' });
  assert.equal((await route.GET(null, { params })).status, 403);
  state.login();
  assert.equal((await route.GET(null, { params })).status, 403);
  state.user.permissions = ['MANAGE_SHIFTS'];
  prisma.absenceExemption = { findUnique: async () => ({ attachmentName: 'atestado.pdf', attachmentData: new TextEncoder().encode('%PDF-1.7') }) };
  const response = await route.GET(null, { params });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.match(response.headers.get('Content-Disposition'), /^attachment;/);
  assert.equal(await response.text(), '%PDF-1.7');
});

test('salvamento individual inclui VT e rejeita competência fechada', async () => {
  const { load, state, prisma } = harness();
  state.user.permissions = ['MANAGE_PAYROLL'];
  state.login();
  prisma.$transaction = async callback => callback(prisma);
  prisma.monthlyPayroll.findUniqueOrThrow = async () => ({ month: 0, year: 2026, vtValue: 50 });
  prisma.payrollStatus.findUnique = async () => null;
  const action = load('actions/monthly-payroll.ts').saveMonthlyPayrollRow;
  await action('row', { baseValue: 1000, extras: 10, discounts: 20, observations: '', isPaid: true });
  assert.equal(state.writes[0].data.total, 1040);
  assert.equal(state.writes[0].where.isPaid, false);
  assert.equal(Object.hasOwn(state.writes[0].data, 'isPaid'), false);
  prisma.payrollStatus.findUnique = async () => ({ status: 'APROVADO' });
  await assert.rejects(() => action('row', { baseValue: 1000, extras: 10, discounts: 20 }), /Reabra/);
  assert.equal(state.writes.length, 1);
});

test('sincronização preserva pago e competência enviada', async () => {
  const { load, prisma } = harness();
  const { syncCalculatedOvertime } = load('lib/payroll-calculation.ts');
  prisma.overtimeEntry.findUnique = async () => ({ status: 'PAGO' });
  prisma.payrollStatus.findUnique = async () => null;
  await syncCalculatedOvertime(prisma, 'employee', 0, 2026);
  prisma.overtimeEntry.findUnique = async () => null;
  prisma.payrollStatus.findUnique = async () => ({ status: 'ENVIADO' });
  await syncCalculatedOvertime(prisma, 'employee', 0, 2026);
});

test('prévia usa salário base e preserva ajustes, sem duplicar extras na folha', async () => {
  const { load, state, prisma } = harness();
  state.user.role = 'ADMIN';
  state.login();
  prisma.$transaction = async callback => callback(prisma);
  prisma.payrollStatus.findUnique = async () => null;
  prisma.employee = {
    findMany: async () => [{ id: 'emp' }],
    findUniqueOrThrow: async () => ({ ...employee, name: 'Teste', contractType: 'CLT', baseSalary: 2000, monthParities: [], shifts: [], absenceExemptions: [] }),
  };
  prisma.systemConfig = { findMany: async () => [] };
  prisma.monthlyPayroll.findUnique = async () => ({ extras: 10, discounts: 5, isPaid: false });
  prisma.monthlyPayroll.upsert = async args => { state.writes.push(args); };
  prisma.overtimeEntry.findUnique = async () => ({ status: 'PAGO' });
  await load('actions/monthly-payroll.ts').generateMonthPreview(0, 2026);
  assert.equal(state.writes[0].create.baseValue, 2000);
  assert.equal(state.writes[0].create.extras, 0);
  assert.equal(state.writes[0].update.total, 2005);
  assert.equal(Object.hasOwn(state.writes[0].update, 'extras'), false);
});

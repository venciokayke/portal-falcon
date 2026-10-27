const assert = require('node:assert/strict');
const { test } = require('node:test');
const bcrypt = require('bcryptjs');

const { harness } = require('./test-support.cjs');

test('ações protegidas recusam chamada anônima antes de consultar ou gravar dados', async () => {
  const { load, state } = harness();
  for (const file of ['employee', 'shift', 'monthly-payroll', 'overtime', 'payroll', 'accounting-report', 'accounting-report-db', 'benefits-report-db', 'config', 'workLocation', 'payroll-status', 'system-user']) {
    const actions = load(`actions/${file}.ts`);
    for (const [name, action] of Object.entries(actions)) {
      if (['createInitialAdmin', 'hasNoSystemUsers'].includes(name)) continue;
      await assert.rejects(() => action(), /Não autenticado/, `${file}.${name}`);
    }
  }
  assert.equal(state.writes.length, 0);
});

test('permissões do token não substituem as permissões atuais do banco', async () => {
  const { load, state } = harness();
  state.login();
  const auth = load('lib/auth.ts');
  await assert.rejects(() => auth.requireRole('ADMIN'), /Acesso negado/);
  await assert.rejects(() => auth.requirePermission('MANAGE_PAYROLL'), /Acesso negado/);
  state.user.permissions = ['MANAGE_SHIFTS'];
  await auth.requirePermission('MANAGE_SHIFTS');
  await assert.rejects(() => auth.requirePermission('VIEW_REPORTS'), /Acesso negado/);
  state.user.role = 'ADMIN';
  await auth.requirePermission('VIEW_REPORTS');
});

test('cada módulo recusa USER sem a permissão necessária', async () => {
  const { load, state } = harness();
  state.login();
  for (const file of ['employee', 'shift', 'monthly-payroll', 'overtime', 'payroll', 'accounting-report', 'accounting-report-db', 'benefits-report-db', 'config', 'workLocation', 'payroll-status']) {
    for (const [name, action] of Object.entries(load(`actions/${file}.ts`))) {
      if (['getGlobalRates', 'getWorkLocations'].includes(name)) continue;
      await assert.rejects(() => action(), /Acesso negado/, `${file}.${name}`);
    }
  }
  await assert.rejects(() => load('actions/activity-log.ts').getActivityLogs(), /Acesso negado/);
  assert.equal(state.writes.length, 0);
});

test('callback de sessão invalida token legado ou conta alterada', async () => {
  const { load, state } = harness();
  const callbacks = load('lib/auth-options.ts').authOptions.callbacks;
  const token = await callbacks.jwt({ token: {}, user: { ...state.user, authVersion: state.user.updatedAt.toISOString() } });
  const valid = await callbacks.session({ session: { user: {} }, token });
  assert.equal(valid.user.id, 'actor');
  const legacy = await callbacks.session({ session: { user: {} }, token: { id: 'actor' } });
  assert.equal(legacy.user, undefined);
  state.user.updatedAt = new Date('2026-10-26T13:00:00Z');
  const revoked = await callbacks.session({ session: { user: {} }, token });
  assert.equal(revoked.user, undefined);
});

test('sessões antigas, contas excluídas e troca obrigatória são bloqueadas', async () => {
  const { load, state } = harness();
  const auth = load('lib/auth.ts');
  state.login();
  state.user.updatedAt = new Date('2026-10-26T13:00:00Z');
  await assert.rejects(() => auth.requireUser(), /Sessão expirada/);
  state.login();
  state.user.mustChangePassword = true;
  await assert.rejects(() => auth.requireUser(), /Altere sua senha/);
  await auth.requireUser(true);
  state.user = null;
  await assert.rejects(() => auth.requireUser(), /Sessão expirada/);
});

test('USER não muda senha alheia nem paga folha ou extras', async () => {
  const { load, state } = harness();
  state.login();
  await assert.rejects(() => load('actions/system-user.ts').updateSystemUserPassword('target', 'new-password'), /Acesso negado/);
  await assert.rejects(() => load('actions/monthly-payroll.ts').togglePaymentStatus('row', true), /Acesso negado/);
  await assert.rejects(() => load('actions/overtime.ts').toggleOvertimeStatus('row', 'PAGO'), /Acesso negado/);
  assert.equal(state.writes.length, 0);
});

test('MANAGER paga com identidade atual e não altera senha de ADMIN', async () => {
  const { load, state } = harness();
  state.user.role = 'MANAGER';
  state.login();
  await load('actions/monthly-payroll.ts').togglePaymentStatus('row', true);
  await load('actions/overtime.ts').toggleOvertimeStatus('extra', 'PAGO');
  assert.equal(state.writes.length, 2);
  assert.equal(state.writes[0].data.approvedById, 'actor');
  assert.equal(state.writes[1].data.approvedById, 'actor');
  state.target.role = 'ADMIN';
  await assert.rejects(() => load('actions/system-user.ts').updateSystemUserPassword('target', 'new-password'), /Acesso negado/);
  await assert.rejects(() => load('actions/overtime.ts').toggleOvertimeStatus('extra', 'INVALID'), /Status inválido/);
  await assert.rejects(() => load('actions/monthly-payroll.ts').togglePaymentStatus('row', 'true'), /Status inválido/);
  assert.equal(state.writes.length, 2);
});

test('troca própria exige senha atual e fluxo obrigatório não serve de atalho', async () => {
  const { load, state } = harness();
  state.user.password = state.target.password;
  state.login();
  const users = load('actions/system-user.ts');
  await assert.rejects(() => users.updateSystemUserPassword('actor', 'new-password', 'wrong'), /Senha atual incorreta/);
  await assert.rejects(() => users.forceChangeUserPassword('new-password', 'new-password'), /não exige troca/);
  await users.updateSystemUserPassword('actor', 'new-password', 'old-password');
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0].data.mustChangePassword, false);
  assert.equal(await bcrypt.compare('new-password', state.writes[0].data.password), true);
  state.user.mustChangePassword = true;
  await users.forceChangeUserPassword('replacement-password', 'replacement-password');
  assert.equal(state.writes[1].where.id, 'actor');
  assert.equal(state.writes[1].data.mustChangePassword, false);
});

test('reset gera senhas diferentes e exige troca no próximo acesso', async () => {
  const { load, state } = harness();
  state.user.role = 'ADMIN';
  state.login();
  const users = load('actions/system-user.ts');
  await assert.rejects(() => users.resetUserPassword('actor'), /Use Alterar Senha/);
  const first = await users.resetUserPassword('target');
  const second = await users.resetUserPassword('target');
  assert.notEqual(first.message, second.message);
  assert.equal(first.message.includes('Mudar@123'), false);
  const password = first.message.match(/Senha provisória: (\S+)\./)[1];
  assert.equal(await bcrypt.compare(password, state.writes[0].data.password), true);
  assert.equal(state.writes[0].data.mustChangePassword, true);
});

test('taxas inválidas não chegam ao banco', async () => {
  const { load, state } = harness();
  state.user.role = 'ADMIN';
  state.login();
  for (const rate of [-1, NaN, Infinity, '13', 1000000]) {
    await assert.rejects(() => load('actions/config.ts').saveGlobalRates(rate, 13), /taxas válidas/);
  }
  assert.equal(state.writes.length, 0);
});

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const bcrypt = require('bcryptjs');

// Executa os módulos reais, substituindo somente sessão, banco e efeitos do Next.
function harness() {
  const state = {
    session: null,
    user: { id: 'actor', name: 'Actor', username: 'actor', role: 'USER', permissions: [], mustChangePassword: false, updatedAt: new Date('2026-10-26T12:00:00Z') },
    target: { id: 'target', role: 'USER', password: bcrypt.hashSync('old-password', 4) },
    writes: [],
  };
  const record = async args => { state.writes.push(args); return args; };
  const prisma = {
    systemUser: {
      findUnique: async ({ where }) => where.id === 'actor' ? state.user : state.target,
      update: record,
    },
    monthlyPayroll: { update: record },
    overtimeEntry: { update: record },
    payrollStatus: { upsert: record },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const requireMock = id => {
      if (id === '@/lib/prisma') return { prisma };
      if (id === 'next-auth') return { getServerSession: async () => state.session };
      if (id === '@/lib/auth-options') return { authOptions: {} };
      if (id === '@/actions/activity-log') return { logActivity: async () => {} };
      if (id === '@/lib/activity-log') return { writeActivityLog: async () => {} };
      if (id === 'next/cache') return { revalidatePath: () => {} };
      if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(requireMock, module, module.exports);
    return module.exports;
  }
  state.login = () => { state.session = { user: { id: 'actor', role: 'ADMIN', authVersion: state.user.updatedAt.toISOString() } }; };
  return { state, load, prisma };
}


module.exports = { harness };

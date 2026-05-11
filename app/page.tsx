import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/utils/calculatePayroll";
import { getDaysInMonth } from "date-fns";
import Link from "next/link";
import GlobalRatesWidget from "./components/GlobalRatesWidget";
import { getGlobalRates } from "@/actions/config";
import {
  Users, DollarSign, UserMinus, Clock, AlertTriangle,
  FileWarning, BarChart3, AlertCircle, CheckCircle2, Siren
} from "lucide-react";

export const dynamic = 'force-dynamic';

/** Returns the Nth business day (Mon–Fri) of a given month/year. 1-indexed. */
function getNthBusinessDay(year: number, month: number, n: number): Date {
  let count = 0;
  let day = 1;
  const daysInMonth = getDaysInMonth(new Date(year, month));
  while (day <= daysInMonth) {
    const date = new Date(year, month, day);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      count++;
      if (count === n) return date;
    }
    day++;
  }
  return new Date(year, month, day - 1);
}

export default async function DashboardPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

  // ─── Queries paralelas ───────────────────────────────────────────────────────
  const [activeEmployees, openShiftsRaw, unpaidPayrolls, globalRates] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: {
        shifts: {
          where: { referenceDate: { gte: startOfMonth, lte: endOfMonth } }
        }
      }
    }),
    // Turnos com entrada preenchida e saída nula no mês atual
    prisma.shift.findMany({
      where: {
        checkIn: { not: null },
        checkOut: null,
        referenceDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { employee: { select: { id: true, name: true } } }
    }),
    // Folhas não pagas do mês atual
    prisma.monthlyPayroll.findMany({
      where: { month: currentMonth + 1, year: currentYear, isPaid: false },
      include: { employee: { select: { name: true } } }
    }),
    getGlobalRates(),
  ]);

  // ─── Cálculos financeiros ────────────────────────────────────────────────────
  let totalAbsences = 0;
  let totalOvertimeHours = 0;
  let projectedFinancial = 0;

  activeEmployees.forEach(emp => {
    if (emp.contractType !== 'PJ_FIXO') {
      const result = calculatePayroll(emp, emp.shifts, currentMonth, currentYear, globalRates.extraHourRate);
      totalAbsences += result.currentMonthAbsences;
      totalOvertimeHours += result.extraHoursBalance;
      projectedFinancial += result.extraValue + result.suggestedVA + result.suggestedVT;
    }
  });

  // ─── Alertas de Plantões em Aberto ──────────────────────────────────────────
  // Agrupar por funcionário
  const openShiftsByEmployee = openShiftsRaw.reduce<Record<string, { id: string; name: string; count: number }>>((acc, shift) => {
    const empId = shift.employee.id;
    if (!acc[empId]) acc[empId] = { id: empId, name: shift.employee.name, count: 0 };
    acc[empId].count++;
    return acc;
  }, {});
  const openShiftEmployees = Object.values(openShiftsByEmployee);

  // ─── 5º Dia Útil ─────────────────────────────────────────────────────────────
  const thirdBusinessDay = getNthBusinessDay(currentYear, currentMonth, 3);
  const fifthBusinessDay = getNthBusinessDay(currentYear, currentMonth, 5);
  const isPastThirdBD = currentDate >= thirdBusinessDay;
  const showPaymentUrgency = isPastThirdBD && unpaidPayrolls.length > 0;

  const fifthBDFormatted = fifthBusinessDay.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // ─── Distribuição por empresa ────────────────────────────────────────────────
  const fillingStatus = activeEmployees
    .filter(emp => emp.contractType !== 'PJ_FIXO')
    .map(emp => ({ name: emp.name, shiftCount: emp.shifts.length }))
    .sort((a, b) => a.shiftCount - b.shiftCount)
    .slice(0, 5);

  const companies = { FALCON_SERVICE: 0, FALCON_MONITORAMENTO: 0, NAO_REGISTRADO: 0 };
  activeEmployees.forEach(emp => {
    companies[emp.registrationCompany as keyof typeof companies]++;
  });
  const maxCompanyCount = Math.max(companies.FALCON_SERVICE, companies.FALCON_MONITORAMENTO, companies.NAO_REGISTRADO, 1);

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ── Título ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel Operacional</h1>
        <p className="text-slate-500 mt-1">
          Visão geral do sistema neste mês ({currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
        </p>
      </div>

      {/* ══════════════════ QUADRO DE AVISOS ══════════════════ */}
      {(showPaymentUrgency || openShiftEmployees.length > 0 || unpaidPayrolls.length > 0 || daysInMonth === 31) && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">📋 Quadro de Avisos</h2>

          {/* 🚨 Alerta crítico: 5º dia útil */}
          {showPaymentUrgency && (
            <div className="relative overflow-hidden bg-red-600 text-white rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-red-200">
              <div className="absolute inset-0 animate-pulse bg-red-700 opacity-20 rounded-xl pointer-events-none" />
              <Siren className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-200" />
              <div>
                <h3 className="font-bold text-white">ATENÇÃO: Prazo de Pagamento se Aproxima!</h3>
                <p className="text-red-100 text-sm mt-0.5">
                  O 5º dia útil é <span className="font-bold text-white">{fifthBDFormatted}</span>.
                  Ainda há <span className="font-bold">{unpaidPayrolls.length} folha(s)</span> não pagas.
                  Feche a folha e realize os pagamentos!
                </p>
              </div>
            </div>
          )}

          {/* ⚠️ Plantões em aberto */}
          {openShiftEmployees.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-500 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">
                    ⚠️ {openShiftsRaw.length} plantão(ões) em aberto precisam de fechamento
                  </h3>
                  <p className="text-amber-700 text-xs mt-0.5">Turnos com entrada registrada mas sem horário de saída.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {openShiftEmployees.map(emp => (
                  <Link
                    key={emp.id}
                    href={`/ponto/${emp.id}`}
                    className="flex items-center justify-between px-4 py-2.5 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg hover:bg-yellow-100 transition-colors group"
                  >
                    <span className="font-medium text-slate-800 text-sm">{emp.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-yellow-200 text-yellow-900 rounded-full">
                      {emp.count} turno(s) em aberto →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 💸 Folhas não pagas */}
          {unpaidPayrolls.length > 0 && !showPaymentUrgency && (
            <div className="bg-orange-50 border border-orange-200 border-l-4 border-l-orange-500 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <DollarSign className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-orange-900 text-sm">
                  💸 {unpaidPayrolls.length} funcionário(s) com folha pendente de pagamento este mês
                </h3>
                <p className="text-orange-700 text-xs mt-0.5">
                  {unpaidPayrolls.map(p => p.employee.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Alerta de mês com 31 dias */}
          {daysInMonth === 31 && (
            <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 text-sm">Alerta de Escala: Mês de 31 dias</h3>
                <p className="text-blue-700 text-xs mt-0.5">
                  Confira e ajuste a paridade (Par/Ímpar) dos colaboradores 12x36 para evitar furos na virada do mês.
                </p>
              </div>
            </div>
          )}

          {/* Tudo OK */}
          {openShiftEmployees.length === 0 && unpaidPayrolls.length === 0 && daysInMonth !== 31 && (
            <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-500 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-green-800 text-sm font-medium">Tudo em ordem! Nenhum alerta pendente neste mês.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Cards de Métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Ativos</p>
            <h3 className="text-2xl font-bold text-slate-800">{activeEmployees.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Projeção Variável</p>
            <h3 className="text-2xl font-bold text-slate-800">{fmt.format(projectedFinancial)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-red-100 rounded-lg text-red-600">
            <UserMinus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Faltas no Mês</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalAbsences}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Horas Extras Totais</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalOvertimeHours.toFixed(1)}h</h3>
          </div>
        </div>
      </div>

      {/* ── Painéis inferiores ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status de Preenchimento */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <FileWarning className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Atenção ao Lançamento</h3>
          </div>
          <div className="flex-1 p-0 flex flex-col justify-center">
            {fillingStatus.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {fillingStatus.map((emp, i) => (
                  <li key={i} className="flex justify-between items-center p-5 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-700">{emp.name}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${emp.shiftCount === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {emp.shiftCount} turnos
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Users className="h-8 w-8 text-slate-300" />
                <p>Nenhum funcionário ativo no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Distribuição por Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Distribuição por Empresa</h3>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Falcon Service</span>
                  <span className="font-bold text-slate-800">{companies.FALCON_SERVICE}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.FALCON_SERVICE / maxCompanyCount) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Falcon Monitoramento</span>
                  <span className="font-bold text-slate-800">{companies.FALCON_MONITORAMENTO}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.FALCON_MONITORAMENTO / maxCompanyCount) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Não Registrados</span>
                  <span className="font-bold text-slate-800">{companies.NAO_REGISTRADO}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-slate-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.NAO_REGISTRADO / maxCompanyCount) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Taxas Globais ── */}
      <GlobalRatesWidget
        initialExtraHourRate={globalRates.extraHourRate}
        initialWorkedHourRate={globalRates.workedHourRate}
      />
    </div>
  );
}

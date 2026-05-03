import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "@/utils/calculatePayroll";
import { getDaysInMonth } from "date-fns";
import { Users, DollarSign, UserMinus, Clock, AlertTriangle, FileWarning, BarChart3 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentDate);

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

  const activeEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      shifts: {
        where: {
          referenceDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }
    }
  });

  let totalAbsences = 0;
  let totalOvertimeHours = 0;
  let projectedFinancial = 0;

  activeEmployees.forEach(emp => {
    const result = calculatePayroll(emp, emp.shifts, currentMonth, currentYear);
    totalAbsences += result.currentMonthAbsences;
    totalOvertimeHours += result.extraHoursBalance;
    projectedFinancial += result.extraValue + result.suggestedVA + result.suggestedVT;
  });

  const fillingStatus = [...activeEmployees]
    .map(emp => ({ name: emp.name, shiftCount: emp.shifts.length }))
    .sort((a, b) => a.shiftCount - b.shiftCount)
    .slice(0, 5);

  const companies = {
    FALCON_SERVICE: 0,
    FALCON_MONITORAMENTO: 0,
    NAO_REGISTRADO: 0
  };
  activeEmployees.forEach(emp => {
    companies[emp.registrationCompany as keyof typeof companies]++;
  });

  const maxCompanyCount = Math.max(companies.FALCON_SERVICE, companies.FALCON_MONITORAMENTO, companies.NAO_REGISTRADO, 1);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Painel Operacional</h1>
        <p className="text-slate-500 mt-1">Visão geral do sistema neste mês ({currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})</p>
      </div>

      {daysInMonth === 31 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3 shadow-sm transition-transform hover:translate-x-1">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-800">Alerta de Escala: Mês de 31 dias</h3>
            <p className="text-sm text-amber-700 mt-1">
              O mês atual tem 31 dias. Lembre-se de conferir e ajustar a paridade (Par/Ímpar) dos colaboradores na escala 12x36 para garantir que não haja furos de turno na virada do mês.
            </p>
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
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
            <h3 className="text-2xl font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedFinancial)}
            </h3>
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

        {/* Gráfico de Distribuição por Empresa */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Distribuição por Empresa</h3>
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center">
            <div className="flex flex-col gap-6">
              
              {/* Falcon Service */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Falcon Service</span>
                  <span className="font-bold text-slate-800">{companies.FALCON_SERVICE}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.FALCON_SERVICE / maxCompanyCount) * 100}%` }}></div>
                </div>
              </div>

              {/* Falcon Monitoramento */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Falcon Monitoramento</span>
                  <span className="font-bold text-slate-800">{companies.FALCON_MONITORAMENTO}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.FALCON_MONITORAMENTO / maxCompanyCount) * 100}%` }}></div>
                </div>
              </div>

              {/* Não Registrados */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700">Não Registrados</span>
                  <span className="font-bold text-slate-800">{companies.NAO_REGISTRADO}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-slate-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(companies.NAO_REGISTRADO / maxCompanyCount) * 100}%` }}></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

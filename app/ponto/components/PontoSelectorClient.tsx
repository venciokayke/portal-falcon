"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, ChevronRight, Search, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PontoSelectorClient({
  employees,
  initialMonth,
  initialYear,
}: {
  employees: any[];
  initialMonth: number;
  initialYear: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const lowerSearch = search.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(lowerSearch));
  }, [search, employees]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = Number(e.target.value);
    setMonth(newMonth);
    router.push(`/ponto?month=${newMonth}&year=${year}`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    setYear(newYear);
    router.push(`/ponto?month=${month}&year=${newYear}`);
  };

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Clock className="h-6 w-6 text-blue-600" />
            Lançamento de Ponto
          </h1>
          <p className="text-gray-500 text-sm mt-1">Selecione um colaborador para gerenciar os turnos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          
          <select 
            value={month} 
            onChange={handleMonthChange}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          
          <select 
            value={year} 
            onChange={handleYearChange}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <Link
            href={`/ponto/${emp.id}?month=${month}&year=${year}`}
            key={emp.id}
            className={`flex items-center justify-between p-4 border rounded-xl shadow-sm transition-all group ${
              emp.isActive 
                ? "bg-white border-gray-200 hover:shadow-md hover:border-blue-300" 
                : "bg-gray-50 border-gray-300 hover:shadow-md hover:border-gray-400 opacity-80"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold transition-colors ${emp.isActive ? 'text-gray-900 group-hover:text-blue-700' : 'text-gray-700'}`}>
                  {emp.name}
                </h3>
                {!emp.isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    <UserMinus className="w-3 h-3" /> Arquivado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {({ 'CLT': 'CLT', 'HORISTA': 'Horista', 'PJ_FIXO': 'PJ Fixo', 'PJ_HORISTA': 'PJ Horista' } as Record<string, string>)[emp.contractType as string] ?? emp.contractType}
                {' • '}
                {({ 'FIXED_220': '220h Mensais', 'FIXED_180': '180h Mensais', 'SCALE_12X36': 'Escala 12x36', 'CUSTOM': 'Personalizada' } as Record<string, string>)[emp.workSchedule as string] ?? emp.workSchedule}
              </p>
            </div>
            <ChevronRight className={`w-5 h-5 transition-colors ${emp.isActive ? 'text-gray-400 group-hover:text-blue-600' : 'text-gray-400'}`} />
          </Link>
        ))}

        {filteredEmployees.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
            {search ? "Nenhum colaborador encontrado para a busca." : "Nenhum colaborador ativo encontrado no sistema."}
          </div>
        )}
      </div>
    </div>
  );
}

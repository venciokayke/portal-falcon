"use client";

import { useState, useEffect, useCallback } from "react";
import { saveShifts, getShifts, deleteShift } from "@/actions/shift";
import { Calendar, MapPin, Plus, Trash2, Save, Clock, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function TimeTrackingClient({ employee }: { employee: any }) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [shifts, setShifts] = useState<Record<string, any[]>>({});
  const [savedShiftsList, setSavedShiftsList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const router = useRouter();

  const loadSavedShifts = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const data = await getShifts(employee.id, selectedMonth, selectedYear);
      setSavedShiftsList(data);
    } catch (error) {
      console.error("Erro ao carregar turnos", error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [employee.id, selectedMonth, selectedYear]);

  useEffect(() => {
    loadSavedShifts();
  }, [loadSavedShifts]);

  const daysCount = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = Array.from({ length: daysCount }, (_, i) => {
    const day = i + 1;
    const date = new Date(selectedYear, selectedMonth, day);
    return {
      day,
      dateString: `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      dayOfWeek: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace('.', '')
    };
  });

  const handleAddShift = (dateString: string) => {
    const currentDayShifts = shifts[dateString] || [];
    setShifts({
      ...shifts,
      [dateString]: [
        ...currentDayShifts,
        { id: Date.now().toString() + Math.random().toString(), location: "", checkIn: "", checkOut: "" }
      ]
    });
  };

  const handleUpdateShift = (dateString: string, id: string, field: string, value: string) => {
    const currentDayShifts = shifts[dateString] || [];
    setShifts({
      ...shifts,
      [dateString]: currentDayShifts.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const handleRemoveShift = (dateString: string, id: string) => {
    const currentDayShifts = shifts[dateString] || [];
    setShifts({
      ...shifts,
      [dateString]: currentDayShifts.filter(s => s.id !== id)
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const allShiftsToSave: any[] = [];
      for (const [dateString, dayShifts] of Object.entries(shifts)) {
        for (const shift of dayShifts) {
          if (shift.location && shift.checkIn && shift.checkOut) {
            allShiftsToSave.push({
              referenceDate: dateString,
              location: shift.location,
              checkIn: shift.checkIn,
              checkOut: shift.checkOut
            });
          }
        }
      }

      if (allShiftsToSave.length === 0) {
        alert("Nenhum turno completo (Local, Entrada e Saída) para salvar.");
        setIsSaving(false);
        return;
      }

      await saveShifts(employee.id, allShiftsToSave);
      alert("Turnos salvos com sucesso!");
      setShifts({});
      loadSavedShifts();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar turnos.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedShift = async (id: string) => {
    if (confirm("Tem certeza que deseja apagar este turno do sistema?")) {
      await deleteShift(id);
      loadSavedShifts();
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Cabeçalho de Impressão */}
        <div className="hidden print:block text-center mb-6 border-b-2 border-black pb-2 mt-4">
          <h2 className="text-xl font-bold uppercase tracking-widest text-black">Espelho de Conferência</h2>
          <p className="text-md mt-2 font-semibold text-black">
            {employee.name} - Mês: {MONTHS[selectedMonth]}/{selectedYear}
          </p>
        </div>

        {/* Controles do Topo (Oculto na Impressão) */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Calendar className="text-gray-500 h-5 w-5" />
            <select 
              value={selectedMonth} 
              onChange={e => {
                setSelectedMonth(Number(e.target.value));
                setShifts({});
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700 transition-shadow"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => {
                setSelectedYear(Number(e.target.value));
                setShifts({});
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700 transition-shadow"
            >
              {Array.from({length: 5}, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              title="Imprimir Conferência"
            >
              <Printer className="h-5 w-5" />
              Imprimir Lançamentos
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Salvando..." : "Salvar Novos Lançamentos"}
            </button>
          </div>
        </div>

        {/* Tabela Principal (Visível e também base da impressão) */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-sm text-left print:text-xs print:border-collapse print:border print:border-black">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 print:bg-gray-100 print:text-black">
              <tr>
                <th className="px-6 py-4 font-semibold w-32 print:border print:border-black print:py-2">Data</th>
                <th className="px-6 py-4 font-semibold print:border print:border-black print:py-2">Turnos (Local, Entrada, Saída)</th>
                <th className="px-6 py-4 font-semibold text-right w-24 print:hidden">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 print:divide-black">
              {daysArray.map(({ day, dateString, dayOfWeek }) => {
                const isWeekend = dayOfWeek.includes("sáb") || dayOfWeek.includes("dom");
                const dayShifts = shifts[dateString] || [];
                
                // Filtra os turnos salvos que pertencem a este dia específico
                const savedForDay = savedShiftsList.filter(shift => {
                  const d = new Date(shift.referenceDate);
                  const shiftDateString = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
                  return shiftDateString === dateString;
                });

                // Se estamos na impressão e o dia não tem turno salvo, podemos omitir a linha ou deixar em branco
                // Para manter a grade completa de conferência igual à outra, deixaremos a linha com os espaços vazios.

                return (
                  <tr key={day} className={`transition-colors ${isWeekend ? 'bg-gray-50/80' : 'bg-white hover:bg-gray-50'} print:bg-white print:border-b print:border-black`}>
                    <td className="px-6 py-4 border-r border-gray-100 align-top print:border-r print:border-black print:py-2 print:text-black">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 print:text-black">{String(day).padStart(2, '0')}/{String(selectedMonth + 1).padStart(2, '0')}</span>
                        <span className={`text-xs mt-0.5 ${isWeekend ? 'text-blue-600 font-medium' : 'text-gray-500'} capitalize print:text-black print:font-normal`}>{dayOfWeek}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top print:border-r print:border-black print:py-2">
                      <div className="flex flex-col gap-3">
                        
                        {/* 1. Turnos Já Salvos (Histórico do dia) */}
                        {savedForDay.map((shift) => (
                          <div key={shift.id} className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-green-50/50 p-3 rounded-lg border border-green-200 shadow-sm border-l-4 border-l-green-500 print:bg-transparent print:border-none print:shadow-none print:p-0">
                            <div className="flex-1 w-full flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600 print:hidden" />
                              <span className="font-medium text-gray-800 print:text-black">{shift.location}</span>
                            </div>
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-green-700 font-medium border border-green-200 print:bg-transparent print:border-none print:text-black print:p-0">
                                <Clock className="h-3.5 w-3.5 print:hidden" />
                                {shift.checkIn} <span className="text-gray-400 font-normal px-1 print:text-black">até</span> {shift.checkOut}
                              </span>
                              <button
                                onClick={() => handleDeleteSavedShift(shift.id)}
                                className="p-2 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors print:hidden"
                                title="Remover Turno Salvo do Banco"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* 2. Formulário de Novos Turnos (Pendente de salvar) */}
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="flex flex-col lg:flex-row gap-3 items-start lg:items-center animate-in fade-in slide-in-from-left-2 duration-200 bg-white p-3 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-blue-500 print:hidden">
                            <div className="relative flex-1 w-full">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-4 w-4 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={shift.location}
                                onChange={(e) => handleUpdateShift(dateString, shift.id, "location", e.target.value)}
                                placeholder="Novo Local (Ex: Matriz)"
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow bg-blue-50/30"
                              />
                            </div>
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                              <input
                                type="time"
                                value={shift.checkIn}
                                onChange={(e) => handleUpdateShift(dateString, shift.id, "checkIn", e.target.value)}
                                className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-700 transition-shadow bg-blue-50/30"
                              />
                              <span className="text-gray-400 font-medium px-1">até</span>
                              <input
                                type="time"
                                value={shift.checkOut}
                                onChange={(e) => handleUpdateShift(dateString, shift.id, "checkOut", e.target.value)}
                                className="px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-700 transition-shadow bg-blue-50/30"
                              />
                              <button
                                onClick={() => handleRemoveShift(dateString, shift.id)}
                                className="p-2 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                title="Cancelar Lançamento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Mensagem Vazia se não tiver nenhum dos dois */}
                        {savedForDay.length === 0 && dayShifts.length === 0 && (
                          <span className="text-gray-400 text-sm italic py-1 block print:hidden">Nenhum turno.</span>
                        )}

                        {/* Placeholder para Impressão caso esteja vazio */}
                        {savedForDay.length === 0 && (
                          <div className="hidden print:block w-full h-4"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top border-l border-gray-100 print:hidden">
                      <button
                        onClick={() => handleAddShift(dateString)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                        Turno
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Print Footer */}
          <div className="hidden print:block mt-16 pt-4 border-t border-black text-center text-xs text-black font-semibold uppercase mx-auto w-64 mb-8">
            Visto do Responsável
          </div>
        </div>
      </div>
    </div>
  );
}

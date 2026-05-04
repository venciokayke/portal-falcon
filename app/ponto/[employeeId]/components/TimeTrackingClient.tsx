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

  const calculateShiftHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);

    let inMinutes = inH * 60 + inM;
    let outMinutes = outH * 60 + outM;

    if (outMinutes < inMinutes) {
      outMinutes += 24 * 60;
    }

    return (outMinutes - inMinutes) / 60;
  };

  const totalWorkedHours = savedShiftsList.reduce((acc, shift) => acc + calculateShiftHours(shift.checkIn, shift.checkOut), 0);

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

  // 1. Lógica do 'VALOR P/H' (Taxa Financeira)
  const isCLT = employee.contractType === 'CLT';
  const isPJFixo = employee.contractType === 'PJ_FIXO';
  const isPJHorista = employee.contractType === 'PJ_HORISTA';

  let taxaHora = 0;
  if (isPJFixo) {
    taxaHora = 0;
  } else {
    taxaHora = Number(employee.hourlyRate) || 0;
  }

  // 2. Lógica de 'HORAS PREVISTAS' (Carga Horária Base)
  let horasPrevistas = 0;
  if (isCLT) {
    if (employee.workSchedule === 'FIXED_220') {
      horasPrevistas = 220;
    } else if (employee.workSchedule === 'FIXED_180') {
      horasPrevistas = 180;
    } else if (employee.workSchedule === 'SCALE_12X36') {
      let calcPrevistas = 0;
      for (let d = 1; d <= daysCount; d++) {
        const isPar = d % 2 === 0;
        if (employee.startParity === 'PAR' && isPar) calcPrevistas += 12;
        if (employee.startParity === 'IMPAR' && !isPar) calcPrevistas += 12;
      }
      horasPrevistas = calcPrevistas;
    }
  }

  // 3. Lógica de 'SALDO' e 'TOTAL (R$)' (Fechamento)
  let saldoHoras = 0;
  let valorTotal = 0;

  if (isPJFixo) {
    // PJ FIXO ganha o salário integral, não ganha por hora
    saldoHoras = totalWorkedHours;
    valorTotal = Number(employee.baseSalary) || 0;
  } else if (isPJHorista || employee.contractType === 'HORISTA') {
    // HORISTA ou PJ_HORISTA ganha por hora trabalhada
    saldoHoras = totalWorkedHours;
    valorTotal = totalWorkedHours * taxaHora;
  } else if (isCLT) {
    // CLT ganha as horas a mais
    saldoHoras = totalWorkedHours - horasPrevistas;
    if (saldoHoras > 0) {
      valorTotal = saldoHoras * taxaHora;
    } else {
      valorTotal = 0;
    }
  }

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
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            zoom: 0.85;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
      <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:rounded-none print:bg-transparent">

        {/* Cabeçalho de Impressão */}
        <div className="hidden print:block text-center mb-4 border-b-2 border-black pb-2">
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
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
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

        {/* Tabela Principal (Visível na web, oculta na impressão) */}
        <div className="overflow-x-auto print:hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold w-32">Data</th>
                <th className="px-6 py-4 font-semibold">Turnos (Local, Entrada, Saída)</th>
                <th className="px-6 py-4 font-semibold w-32 text-center">Horas Trab.</th>
                <th className="px-6 py-4 font-semibold text-right w-24">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
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
                  <tr key={day} className={`transition-colors ${isWeekend ? 'bg-gray-50/80' : 'bg-white hover:bg-gray-50'}`}>
                    <td className="px-6 py-4 border-r border-gray-100 align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{String(day).padStart(2, '0')}/{String(selectedMonth + 1).padStart(2, '0')}</span>
                        <span className={`text-xs mt-0.5 ${isWeekend ? 'text-blue-600 font-medium' : 'text-gray-500'} capitalize`}>{dayOfWeek}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-3">

                        {/* 1. Turnos Já Salvos (Histórico do dia) */}
                        {savedForDay.map((shift) => (
                          <div key={shift.id} className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-green-50/50 p-3 rounded-lg border border-green-200 shadow-sm border-l-4 border-l-green-500">
                            <div className="flex-1 w-full flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-gray-800">{shift.location}</span>
                            </div>
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-green-700 font-medium border border-green-200">
                                <Clock className="h-3.5 w-3.5" />
                                {shift.checkIn} <span className="text-gray-400 font-normal px-1">até</span> {shift.checkOut}
                              </span>
                              <button
                                onClick={() => handleDeleteSavedShift(shift.id)}
                                className="p-2 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                title="Remover Turno Salvo do Banco"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* 2. Formulário de Novos Turnos (Pendente de salvar) */}
                        {dayShifts.map((shift) => (
                          <div key={shift.id} className="flex flex-col lg:flex-row gap-3 items-start lg:items-center animate-in fade-in slide-in-from-left-2 duration-200 bg-white p-3 rounded-lg border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
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
                          <span className="text-gray-400 text-sm italic py-1 block">Nenhum turno.</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-top border-l border-gray-100">
                      <div className="flex flex-col gap-3 h-full">
                        {savedForDay.map((shift) => (
                          <div key={shift.id} className="flex items-center justify-center font-bold text-gray-800 p-3 min-h-[46px]">
                            {calculateShiftHours(shift.checkIn, shift.checkOut)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top border-l border-gray-100">
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
            <tfoot>
              <tr className="bg-gray-100 border-t border-gray-300">
                <td className="px-6 py-4 font-bold text-gray-800 text-right uppercase tracking-wider" colSpan={2}>
                  TOTAL MENSAL
                </td>
                <td className="px-6 py-4 font-bold text-center text-gray-900 text-lg">
                  {totalWorkedHours}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Layout Específico para Impressão */}
        <div className="hidden print:flex gap-4 w-full text-black">
          {/* Lado Esquerdo: Tabela Principal (75%) */}
          <div className="w-[75%]">
            <table className="w-full text-xs text-left border-collapse border border-black">
              <thead className="bg-gray-200 border-b border-black text-black">
                <tr>
                  <th className="px-1 py-1 font-semibold border-r border-black w-8 text-center">DATA</th>
                  <th className="px-1 py-1 font-semibold border-r border-black w-8 text-center">DIA</th>
                  <th className="px-1 py-1 font-semibold border-r border-black print:w-[80px] print:max-w-[80px] truncate">LOCAL</th>
                  <th className="px-1 py-1 font-semibold border-r border-black w-14 text-center">ENTRADA</th>
                  <th className="px-1 py-1 font-semibold border-r border-black w-14 text-center">SAÍDA</th>
                  <th className="px-1 py-1 font-semibold border-r border-black w-16 text-center">HORAS TRAB</th>
                  <th className="px-1 py-1 font-semibold w-20">OBSERVAÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {daysArray.map(({ day, dateString, dayOfWeek }) => {
                  const savedForDay = savedShiftsList.filter(shift => {
                    const d = new Date(shift.referenceDate);
                    const shiftDateString = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
                    return shiftDateString === dateString;
                  });

                  // Renderizar 1 linha por dia contendo empilhamento flex caso haja múltiplos turnos
                  return (
                    <tr key={day} className="border-b border-black">
                      <td className="px-1 py-1 border-r border-black text-center align-middle font-medium">
                        {String(day).padStart(2, '0')}
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle uppercase">
                        {dayOfWeek}
                      </td>
                      <td className="px-1 py-1 border-r border-black align-middle print:w-[80px] print:max-w-[80px] overflow-hidden">
                        <div className="flex flex-col gap-1 truncate">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id} className="truncate block">{s.location}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{s.checkIn}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{s.checkOut}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle font-bold">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{calculateShiftHours(s.checkIn, s.checkOut)}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 align-middle">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>&nbsp;</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 border-t border-black">
                  <td className="px-1 py-1 font-bold text-right uppercase border-r border-black" colSpan={5}>TOTAL</td>
                  <td className="px-1 py-1 font-bold text-center border-r border-black">{totalWorkedHours}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Lado Direito: Quadros de Resumo Financeiro (25%) */}
          <div className="w-[25%] flex flex-col gap-6">

            <table className="w-full text-xs text-left border-collapse border border-black bg-white">
              <thead className="bg-yellow-200 border-b border-black text-black">
                <tr>
                  <th className="px-2 py-1 font-bold text-center" colSpan={2}>CÁLCULO TOTAL DE HORAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                <tr>
                  <td className="px-2 py-1 font-semibold border-r border-black w-2/3">HORAS PREVISTAS</td>
                  <td className="px-2 py-1 text-center font-bold">{horasPrevistas}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-semibold border-r border-black w-2/3">HORAS EFETIVAS</td>
                  <td className="px-2 py-1 text-center font-bold">{totalWorkedHours}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-semibold border-r border-black w-2/3 bg-gray-100">SALDO (h)</td>
                  <td className="px-2 py-1 text-center font-bold bg-gray-100">{Math.round(saldoHoras)}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full text-xs text-left border-collapse border border-black bg-white">
              <thead className="bg-blue-200 border-b border-black text-black">
                <tr>
                  <th className="px-2 py-1 font-bold text-center" colSpan={2}>
                    {isPJFixo ? 'FECHAMENTO (CONTRATO FIXO)' : 'CÁLCULO HORAS EXTRAS'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {!isPJFixo && (
                  <tr>
                    <td className="px-2 py-1 font-semibold border-r border-black w-2/3">VALOR P/H (R$)</td>
                    <td className="px-2 py-1 text-center font-bold">{taxaHora.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td className="px-2 py-1 font-semibold border-r border-black w-2/3 bg-gray-100">TOTAL (R$)</td>
                  <td className="px-2 py-1 text-center font-bold bg-gray-100">{valorTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

          </div>
        </div>

      </div>
    </div>
  );
}

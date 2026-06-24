"use client";

import { useState, useEffect, useCallback } from "react";
import { saveShifts, getShifts, deleteShift, updateSavedShift, createEmptyShift, updateEmployeeMonthParity, syncOvertimeEntry } from "@/actions/shift";
import { Calendar, MapPin, Plus, Trash2, Clock, Printer, CheckCircle, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AlertModal } from "@/components/ui/AlertModal";

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function TimeTrackingClient({ 
  employee,
  workLocations,
  initialMonth,
  initialYear,
  initialMonthParity
}: { 
  employee: any;
  workLocations: any[];
  initialMonth: number;
  initialYear: number;
  initialMonthParity: string;
}) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);

  const [shifts, setShifts] = useState<Record<string, any[]>>({});
  const [savedShiftsList, setSavedShiftsList] = useState<any[]>([]);
  const [savedEdits, setSavedEdits] = useState<Record<string, any>>({}); 
  const [isSaving, setIsSaving] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  
  const [anonymousPrint, setAnonymousPrint] = useState(false);
  const [observationModal, setObservationModal] = useState<{isOpen: boolean; shiftId: string; text: string}>({isOpen: false, shiftId: "", text: ""});
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean; shiftId: string}>({isOpen: false, shiftId: ""});
  
  const router = useRouter();

  const [currentParity, setCurrentParity] = useState(initialMonthParity);

  const handleParityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParity = e.target.value as any;
    setCurrentParity(newParity);
    setIsSaving(true);
    setIsSynced(false);
    try {
      await updateEmployeeMonthParity(employee.id, selectedMonth, selectedYear, newParity);
      setIsSynced(true);
      router.refresh();
    } catch (error) {
      console.error("Erro ao atualizar paridade", error);
      setCurrentParity(initialMonthParity);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedShifts = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const data = await getShifts(employee.id, selectedMonth, selectedYear);
      setSavedShiftsList(data);
      setSavedEdits({}); 
    } catch (error) {
      console.error("Erro ao carregar turnos", error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [employee.id, selectedMonth, selectedYear]);

  useEffect(() => {
    loadSavedShifts();
  }, [loadSavedShifts]);

  // Navega de volta ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(`/ponto?month=${selectedMonth + 1}&year=${selectedYear}`);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, selectedMonth, selectedYear]);

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

  const totalWorkedHours = Math.round(savedShiftsList.reduce((acc, shift) => acc + calculateShiftHours(shift.checkIn, shift.checkOut), 0));

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

  // Sugestão de Paridade
  let parDaysCount = 0;
  let imparDaysCount = 0;
  let suggestParity = null;

  if (employee.workSchedule === 'SCALE_12X36') {
    savedShiftsList.forEach(s => {
      const d = new Date(s.referenceDate);
      if (d.getUTCDate() % 2 === 0) parDaysCount++;
      else imparDaysCount++;
    });

    const totalDaysWithShifts = parDaysCount + imparDaysCount;
    if (totalDaysWithShifts >= 3) {
      if (parDaysCount / totalDaysWithShifts >= 0.8 && currentParity !== 'PAR') suggestParity = 'PAR';
      else if (imparDaysCount / totalDaysWithShifts >= 0.8 && currentParity !== 'IMPAR') suggestParity = 'IMPAR';
    }
  }

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
        if (currentParity === 'PAR' && isPar) calcPrevistas += 12;
        if (currentParity === 'IMPAR' && !isPar) calcPrevistas += 12;
      }
      horasPrevistas = calcPrevistas;
    }
  }

  // 3. Lógica de 'SALDO' e 'TOTAL (R$)' (Fechamento)
  let saldoHoras = 0;
  let valorTotal = 0;

  if (isPJFixo) {
    saldoHoras = totalWorkedHours;
    valorTotal = Number(employee.baseSalary) || 0;
  } else if (isPJHorista || employee.contractType === 'HORISTA') {
    saldoHoras = totalWorkedHours;
    valorTotal = totalWorkedHours * taxaHora;
  } else if (isCLT) {
    saldoHoras = totalWorkedHours - horasPrevistas;
    if (saldoHoras > 0) {
      valorTotal = saldoHoras * taxaHora;
    } else {
      valorTotal = 0;
    }
  }

  // Sincronizar horas extras quando o total mudar
  useEffect(() => {
    if (!isLoadingSaved) {
      syncOvertimeEntry(employee.id, selectedMonth + 1, selectedYear, isCLT ? Math.max(0, saldoHoras) : totalWorkedHours, valorTotal);
    }
  }, [totalWorkedHours, saldoHoras, valorTotal, employee.id, selectedMonth, selectedYear, isLoadingSaved, isCLT]);


  const handleAddShift = async (dateString: string) => {
    setIsSaving(true);
    setIsSynced(false);
    try {
      const newId = await createEmptyShift(employee.id, dateString);
      setSavedShiftsList(prev => [
        ...prev,
        { id: newId, referenceDate: new Date(`${dateString}T00:00:00Z`).toISOString(), location: employee.workLocation || "", checkIn: "", checkOut: "", observations: "" }
      ]);
      // Update DB with default location if needed
      if (employee.workLocation) {
        await updateSavedShift(newId, dateString, { location: employee.workLocation });
      }
      setIsSynced(true);
    } catch (e) {
      console.error("Erro ao criar turno", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedShift = async () => {
    const id = confirmDelete.shiftId;
    if (!id) return;
    
    setConfirmDelete({isOpen: false, shiftId: ""});
    setIsSaving(true);
    setIsSynced(false);
    
    try {
      await deleteShift(id);
      setSavedShiftsList(prev => prev.filter(s => s.id !== id));
      setIsSynced(true);
    } catch (error) {
      console.error("Erro deletar", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSavedShiftField = (shiftId: string, field: string, value: string) => {
    setSavedEdits(prev => ({
      ...prev,
      [shiftId]: { ...(prev[shiftId] || {}), [field]: value }
    }));
  };

  const handleBlurSavedShift = async (shift: any) => {
    const edits = savedEdits[shift.id];
    if (!edits || Object.keys(edits).length === 0) return;
    
    const finalLocation = edits.location !== undefined ? edits.location : shift.location;
    const finalCheckIn = edits.checkIn !== undefined ? edits.checkIn : shift.checkIn;
    const finalCheckOut = edits.checkOut !== undefined ? edits.checkOut : shift.checkOut;

    const referenceDate = new Date(shift.referenceDate);
    const referenceDateStr = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, "0")}-${String(referenceDate.getUTCDate()).padStart(2, "0")}`;
    
    setIsSaving(true);
    setIsSynced(false);
    
    // Auto delete se estiver tudo vazio
    if (!finalLocation && !finalCheckIn && !finalCheckOut && !shift.observations && !edits.observations) {
      await deleteShift(shift.id);
      setSavedShiftsList(prev => prev.filter(s => s.id !== shift.id));
      setSavedEdits(prev => { const next = { ...prev }; delete next[shift.id]; return next; });
      setIsSynced(true);
      setIsSaving(false);
      return;
    }

    try {
      await updateSavedShift(shift.id, referenceDateStr, edits);
      setSavedShiftsList(prev => prev.map(s => s.id === shift.id ? { ...s, ...edits } : s));
      setSavedEdits(prev => { const next = { ...prev }; delete next[shift.id]; return next; });
      setIsSynced(true);
    } catch (e) {
      console.error("Erro ao atualizar turno", e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveObservation = async () => {
    if (!observationModal.shiftId) return;
    const shift = savedShiftsList.find(s => s.id === observationModal.shiftId);
    if (!shift) return;
    
    const referenceDate = new Date(shift.referenceDate);
    const referenceDateStr = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, "0")}-${String(referenceDate.getUTCDate()).padStart(2, "0")}`;
    
    setIsSaving(true);
    setIsSynced(false);
    try {
      await updateSavedShift(shift.id, referenceDateStr, { observations: observationModal.text });
      setSavedShiftsList(prev => prev.map(s => s.id === shift.id ? { ...s, observations: observationModal.text } : s));
      setIsSynced(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
      setObservationModal({isOpen: false, shiftId: "", text: ""});
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Apagar Turno"
        message="Tem certeza que deseja remover este turno permanentemente?"
        onConfirm={handleDeleteSavedShift}
        onClose={() => setConfirmDelete({isOpen: false, shiftId: ""})}
      />

      {/* Observation Modal */}
      {observationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Observações do Turno
            </h3>
            <textarea
              autoFocus
              className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
              placeholder="Digite aqui as observações (ex: Atraso devido a chuva, Saída antecipada justificada...)"
              value={observationModal.text}
              onChange={e => setObservationModal(p => ({...p, text: e.target.value}))}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setObservationModal({isOpen: false, shiftId: "", text: ""})} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
              <button onClick={saveObservation} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Salvar</button>
            </div>
          </div>
        </div>
      )}

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
          {!anonymousPrint && (
            <p className="text-md mt-2 font-semibold text-black">
              {employee.name} - Mês: {MONTHS[selectedMonth]}/{selectedYear}
            </p>
          )}
          {anonymousPrint && (
            <p className="text-md mt-2 font-semibold text-black">
              Mês: {MONTHS[selectedMonth]}/{selectedYear}
            </p>
          )}
        </div>

        {/* Controles do Topo (Oculto na Impressão) */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
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

            {employee.workSchedule === 'SCALE_12X36' && (
              <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Escala:</span>
                <select
                  value={currentParity}
                  onChange={handleParityChange}
                  disabled={isSaving}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-gray-700 transition-shadow text-xs cursor-pointer"
                >
                  <option value="NONE">Selecione...</option>
                  <option value="PAR">⚡ Dias Pares</option>
                  <option value="IMPAR">⚡ Dias Ímpares</option>
                </select>
                
                {suggestParity && suggestParity !== currentParity && (
                  <div className="ml-2 flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    Sugerido: {suggestParity === 'PAR' ? 'Pares' : 'Ímpares'}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={anonymousPrint} onChange={e => setAnonymousPrint(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              Ocultar Nome
            </label>
            <button
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              title="Imprimir Conferência"
            >
              <Printer className="h-5 w-5" />
              Imprimir
            </button>
            {/* Status de Sincronização */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg w-32 justify-end">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-blue-600 font-medium">Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-400">Salvo</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabela Principal (Visível na web, oculta na impressão) */}
        <div className="overflow-x-auto print:hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold w-24">Data</th>
                <th className="px-6 py-4 font-semibold">Turnos (Local, Entrada, Saída)</th>
                <th className="px-6 py-4 font-semibold w-32 text-center">Horas Trab.</th>
                <th className="px-6 py-4 font-semibold text-right w-24">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {daysArray.map(({ day, dateString, dayOfWeek }) => {
                const isWeekend = dayOfWeek.includes("sáb") || dayOfWeek.includes("dom");

                const savedForDay = savedShiftsList.filter(shift => {
                  const d = new Date(shift.referenceDate);
                  const shiftDateString = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
                  return shiftDateString === dateString;
                });

                const isPar = day % 2 === 0;
                let isWorkDay = false;
                
                if (employee.workSchedule === 'SCALE_12X36') {
                  if (currentParity === 'PAR' && isPar) isWorkDay = true;
                  if (currentParity === 'IMPAR' && !isPar) isWorkDay = true;
                } else {
                  isWorkDay = !isWeekend;
                }

                // Incomplete shift: has checkIn but no checkOut OR has checkOut but no checkIn. 
                const hasIncompleteShift = savedForDay.some(s => {
                  const edits = savedEdits[s.id] || {};
                  const ci = edits.checkIn !== undefined ? edits.checkIn : s.checkIn;
                  const co = edits.checkOut !== undefined ? edits.checkOut : s.checkOut;
                  return (ci && !co) || (!ci && co);
                });
                
                let rowBgClass = isWorkDay ? 'bg-slate-50' : 'bg-white';
                if (hasIncompleteShift) {
                  rowBgClass = 'bg-yellow-100'; // Aviso amarelo suave
                }

                return (
                  <tr key={day} className={`transition-colors hover:bg-gray-100/50 ${rowBgClass}`}>
                    <td className="px-6 py-4 border-r border-gray-100 align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{String(day).padStart(2, '0')}/{String(selectedMonth + 1).padStart(2, '0')}</span>
                        <span className={`text-xs mt-0.5 ${isWorkDay ? 'text-blue-600 font-medium' : 'text-gray-500'} capitalize`}>{dayOfWeek}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-3">
                        {savedForDay.map((shift) => {
                          const edits = savedEdits[shift.id] || {};
                          const loc = edits.location !== undefined ? edits.location : shift.location;
                          const ci = edits.checkIn !== undefined ? edits.checkIn : shift.checkIn;
                          const co = edits.checkOut !== undefined ? edits.checkOut : shift.checkOut;
                          const obs = edits.observations !== undefined ? edits.observations : shift.observations;
                          
                          const isIncomplete = (ci && !co) || (!ci && co);

                          return (
                          <div key={shift.id} className={`flex flex-col xl:flex-row gap-3 items-start xl:items-center p-3 rounded-lg border shadow-sm border-l-4 ${isIncomplete ? 'bg-yellow-50 border-yellow-200 border-l-yellow-400' : 'bg-green-50/50 border-green-200 border-l-green-500'}`}>
                            <div className="relative flex-1 w-full xl:max-w-xs">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className={`h-4 w-4 ${isIncomplete ? 'text-yellow-600' : 'text-green-600'}`} />
                              </div>
                              <select
                                value={loc}
                                onChange={e => handleUpdateSavedShiftField(shift.id, "location", e.target.value)}
                                onBlur={() => handleBlurSavedShift(shift)}
                                className={`w-full pl-9 pr-3 py-2 border rounded-md focus:ring-2 outline-none text-sm font-medium text-gray-800 bg-white transition-shadow ${isIncomplete ? 'border-yellow-300 focus:ring-yellow-400' : 'border-green-200 focus:ring-green-400'}`}
                              >
                                <option value="">Sem Local</option>
                                {workLocations.map(l => (
                                  <option key={l.id} value={l.name}>{l.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                              <Clock className={`h-3.5 w-3.5 shrink-0 ${isIncomplete ? 'text-yellow-600' : 'text-green-600'}`} />
                              <input
                                type="time"
                                value={ci}
                                onChange={e => handleUpdateSavedShiftField(shift.id, "checkIn", e.target.value)}
                                onBlur={() => handleBlurSavedShift(shift)}
                                className={`px-2 py-1.5 border rounded-md focus:ring-2 outline-none text-sm font-medium text-gray-700 bg-white transition-shadow ${isIncomplete ? 'border-yellow-300 focus:ring-yellow-400' : 'border-green-200 focus:ring-green-400'}`}
                              />
                              <span className="text-gray-400 font-medium px-0.5">até</span>
                              <input
                                type="time"
                                value={co}
                                onChange={e => handleUpdateSavedShiftField(shift.id, "checkOut", e.target.value)}
                                onBlur={() => handleBlurSavedShift(shift)}
                                className={`px-2 py-1.5 border rounded-md focus:ring-2 outline-none text-sm font-medium text-gray-700 bg-white transition-shadow ${isIncomplete ? 'border-yellow-300 focus:ring-yellow-400' : 'border-green-200 focus:ring-green-400'}`}
                              />
                              <button
                                onClick={() => setObservationModal({isOpen: true, shiftId: shift.id, text: obs || ""})}
                                className={`p-2 ml-1 rounded-md transition-colors relative ${obs ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                title="Observações"
                              >
                                <MessageSquare className="h-4 w-4" />
                                {obs && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
                              </button>
                              <button
                                onClick={() => setConfirmDelete({isOpen: true, shiftId: shift.id})}
                                className="p-2 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                title="Remover Turno Salvo do Banco"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          );
                        })}

                        {savedForDay.length === 0 && (
                          <span className="text-gray-400 text-sm italic py-1 block">Nenhum turno.</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center align-middle border-l border-gray-100">
                      <div className="flex flex-col gap-3 h-full">
                        {savedForDay.map((shift) => {
                          const edits = savedEdits[shift.id] || {};
                          const ci = edits.checkIn !== undefined ? edits.checkIn : shift.checkIn;
                          const co = edits.checkOut !== undefined ? edits.checkOut : shift.checkOut;
                          return (
                          <div key={shift.id} className="flex items-center justify-center font-bold text-gray-800 min-h-[46px]">
                            {calculateShiftHours(ci, co)}
                          </div>
                        )})}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top border-l border-gray-100">
                      <button
                        onClick={() => handleAddShift(dateString)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100 whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* WEB Summary Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-gray-200 bg-gray-50 text-gray-800 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="p-4 flex flex-col items-center justify-center">
               <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Horas Previstas</span>
               <span className="text-2xl font-black text-gray-900 mt-1">{horasPrevistas}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
               <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Horas Efetivas (Mensal)</span>
               <span className="text-2xl font-black text-blue-600 mt-1">{totalWorkedHours}</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center bg-blue-50">
               <span className="text-xs font-bold uppercase tracking-wider text-blue-600 text-center">
                  {isPJFixo ? 'Total Saldo' : isCLT ? 'Saldo (Extras/Faltas)' : 'Saldo Efetivo'}
               </span>
               <span className={`text-2xl font-black mt-1 ${saldoHoras < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {saldoHoras > 0 ? '+' : ''}{Math.round(saldoHoras)}
               </span>
            </div>
          </div>

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
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{s.checkIn || "..."}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{s.checkOut || "..."}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 border-r border-black text-center align-middle font-bold">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{calculateShiftHours(s.checkIn, s.checkOut)}</span>) : <span className="text-transparent">.</span>}
                        </div>
                      </td>
                      <td className="px-1 py-1 align-middle text-[10px]">
                        <div className="flex flex-col gap-1">
                          {savedForDay.length > 0 ? savedForDay.map(s => <span key={s.id}>{s.observations || <span className="text-transparent">.</span>}</span>) : <span className="text-transparent">.</span>}
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

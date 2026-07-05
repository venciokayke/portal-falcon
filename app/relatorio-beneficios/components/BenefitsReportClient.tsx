"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Printer, Plus, Calendar, MessageSquare, Loader2, Save, Check } from "lucide-react";
import { logActivity } from "@/actions/activity-log";
import { getBenefitsReportEntries, getMonthlyReportConfig, saveBenefitsReportEntries, saveMonthlyReportConfig } from "@/actions/benefits-report-db";

interface EmployeeBenefit {
  id: string;
  name: string;
  receivesVA: boolean;
  receivesVT: boolean;
  vaUnid: string;
  vaValue: string;
  vtUnid: string;
  vtValue: string;
  observations?: string;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function BenefitsReportClient({
  initialData,
  availableExceptions
}: {
  initialData: EmployeeBenefit[],
  availableExceptions: { id: string, name: string, receivesVA: boolean, receivesVT: boolean }[]
}) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const getStoredData = (): EmployeeBenefit[] => {
    if (typeof window !== "undefined") {
      try {
        const v = sessionStorage.getItem("beneficios_data");
        if (v) return JSON.parse(v);
      } catch {}
    }
    return initialData;
  };

  const getStoredRate = (key: string, fallback: number): number => {
    if (typeof window !== "undefined") {
      const v = sessionStorage.getItem(key);
      if (v !== null) return parseFloat(v);
    }
    return fallback;
  };

  const [vaRate, setVaRateState] = useState(() => getStoredRate("beneficios_vaRate", 26.00));
  const [vtRate, setVtRateState] = useState(() => getStoredRate("beneficios_vtRate", 8.60));
  const [data, setData] = useState<EmployeeBenefit[]>(getStoredData);
  const [exceptions, setExceptions] = useState(availableExceptions);
  const [selectedException, setSelectedException] = useState("");
  const [observationModal, setObservationModal] = useState<{isOpen: boolean; empId: string; text: string}>({isOpen: false, empId: "", text: ""});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const loadData = useCallback(async (m: number, y: number) => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const [dbEntries, dbConfig] = await Promise.all([
        getBenefitsReportEntries(m, y),
        getMonthlyReportConfig(m, y)
      ]);

      if (dbConfig) {
        setVaRateState(dbConfig.vaRate);
        setVtRateState(dbConfig.vtRate);
      } else {
        setVaRateState(26.00);
        setVtRateState(8.60);
      }

      if (dbEntries.length > 0) {
        // Find which ones are exceptions based on the initial data
        const initialIds = new Set(initialData.map(e => e.id));
        const newExceptions = dbEntries
          .filter(e => !initialIds.has(e.employeeId))
          .map(e => {
            const emp = availableExceptions.find(ex => ex.id === e.employeeId);
            return emp ? {
              id: emp.id,
              name: emp.name,
              receivesVA: emp.receivesVA,
              receivesVT: emp.receivesVT,
              vaUnid: e.vaUnid || "",
              vaValue: e.vaValue || "0.00",
              vtUnid: e.vtUnid || "",
              vtValue: e.vtValue || "0.00",
              observations: ""
            } : null;
          }).filter(Boolean) as EmployeeBenefit[];

        const newMainData = initialData.map(emp => {
          const dbEntry = dbEntries.find(e => e.employeeId === emp.id);
          if (dbEntry) {
            return {
              ...emp,
              vaUnid: dbEntry.vaUnid || "",
              vaValue: dbEntry.vaValue || "0.00",
              vtUnid: dbEntry.vtUnid || "",
              vtValue: dbEntry.vtValue || "0.00"
            };
          }
          return emp;
        });

        setData([...newMainData, ...newExceptions]);
        
        // Remove those exceptions from available exceptions
        const newExceptionIds = new Set(newExceptions.map(e => e.id));
        setExceptions(availableExceptions.filter(e => !newExceptionIds.has(e.id)));
      } else {
        setData(initialData);
        setExceptions(availableExceptions);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialData, availableExceptions]);

  useEffect(() => {
    loadData(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loadData]);

  // Persiste os dados editados no sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("beneficios_data", JSON.stringify(data));
    }
  }, [data]);

  const setVaRate = (v: number) => {
    setVaRateState(v);
    if (typeof window !== "undefined") sessionStorage.setItem("beneficios_vaRate", String(v));
  };

  const setVtRate = (v: number) => {
    setVtRateState(v);
    if (typeof window !== "undefined") sessionStorage.setItem("beneficios_vtRate", String(v));
  };

  const handleUpdate = (id: string, field: keyof EmployeeBenefit, value: string) => {
    setData((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        const updated = { ...emp, [field]: value };
        if (field === "vaUnid") updated.vaValue = ((parseFloat(value) || 0) * vaRate).toFixed(2);
        if (field === "vtUnid") updated.vtValue = ((parseFloat(value) || 0) * vtRate).toFixed(2);
        return updated;
      })
    );
  };

  // Recalculate all values when a global rate changes
  const handleRateChange = (type: "va" | "vt", newRate: number) => {
    if (type === "va") {
      setVaRate(newRate);
      setData(prev => prev.map(emp => ({
        ...emp,
        vaValue: emp.receivesVA ? ((parseFloat(emp.vaUnid) || 0) * newRate).toFixed(2) : emp.vaValue
      })));
    } else {
      setVtRate(newRate);
      setData(prev => prev.map(emp => ({
        ...emp,
        vtValue: emp.receivesVT ? ((parseFloat(emp.vtUnid) || 0) * newRate).toFixed(2) : emp.vtValue
      })));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const entriesToSave = data.map(emp => ({
        employeeId: emp.id,
        vaUnid: emp.vaUnid,
        vaValue: emp.vaValue,
        vtUnid: emp.vtUnid,
        vtValue: emp.vtValue,
      }));
      await Promise.all([
        saveBenefitsReportEntries(selectedMonth, selectedYear, entriesToSave),
        saveMonthlyReportConfig(selectedMonth, selectedYear, vaRate, vtRate)
      ]);
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    logActivity("IMPRESSAO_RELATORIO_BENEFICIOS", `Mês/Ano: ${selectedMonth + 1}/${selectedYear}`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleAddException = () => {
    if (!selectedException) return;

    const emp = exceptions.find(e => e.id === selectedException);
    if (!emp) return;

    setExceptions(prev => prev.filter(e => e.id !== emp.id));

    setData(prev => [
      ...prev,
      {
        id: emp.id,
        name: emp.name,
        receivesVA: emp.receivesVA,
        receivesVT: emp.receivesVT,
        vaUnid: "",
        vaValue: "0.00",
        vtUnid: "",
        vtValue: "0.00",
        observations: "",
      }
    ]);
    setSelectedException("");
  };

  // Calculations for the header
  const totals = useMemo(() => {
    return data.reduce(
      (acc, emp) => {
        acc.vaUnid += parseFloat(emp.vaUnid) || 0;
        acc.vaValue += parseFloat(emp.vaValue) || 0;
        acc.vtUnid += parseFloat(emp.vtUnid) || 0;
        acc.vtValue += parseFloat(emp.vtValue) || 0;
        return acc;
      },
      { vaUnid: 0, vaValue: 0, vtUnid: 0, vtValue: 0 }
    );
  }, [data]);

  const generalTotal = totals.vaValue + totals.vtValue;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* Header Consolidado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 print:border-none print:shadow-none print:p-0 print:mb-1">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 print:text-black print:text-sm print:mb-1">Consolidado Geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 print:flex print:flex-wrap print:gap-2">
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-1 print:flex-1 print:min-w-[100px] print:text-center">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600 print:text-[9px] print:leading-none print:mb-0.5">Total VA UNID</p>
            <p className="text-xl font-bold text-gray-900 print:text-xs print:leading-none">{totals.vaUnid}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-1 print:flex-1 print:min-w-[100px] print:text-center">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600 print:text-[9px] print:leading-none print:mb-0.5">Total VALOR V.A.</p>
            <p className="text-xl font-bold text-gray-900 print:text-xs print:leading-none">R$ {totals.vaValue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-1 print:flex-1 print:min-w-[100px] print:text-center">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600 print:text-[9px] print:leading-none print:mb-0.5">Total VT UNID</p>
            <p className="text-xl font-bold text-gray-900 print:text-xs print:leading-none">{totals.vtUnid}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300 print:p-1 print:flex-1 print:min-w-[100px] print:text-center">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600 print:text-[9px] print:leading-none print:mb-0.5">Total VALOR V.T.</p>
            <p className="text-xl font-bold text-gray-900 print:text-xs print:leading-none">R$ {totals.vtValue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 print:bg-transparent print:border-gray-400 print:p-1 print:flex-1 print:min-w-[120px] print:text-center flex flex-col justify-center">
            <p className="text-sm text-blue-600 font-bold print:text-gray-800 print:text-[10px] print:leading-none print:mb-0.5">Soma Geral</p>
            <p className="text-2xl font-black text-blue-700 print:text-black print:text-sm print:leading-none">R$ {generalTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* Taxas Globais (editáveis, ocultas na impressão) */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 print:hidden">
          <p className="text-sm text-gray-500 font-medium self-center">Taxas unitárias:</p>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">VA (R$/unidade):</span>
            <input
              type="number" step="0.01" min="0"
              value={vaRate}
              onChange={e => handleRateChange("va", parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 border border-amber-300 bg-amber-50 rounded-md focus:ring-2 focus:ring-amber-400 outline-none text-sm font-semibold text-right"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">VT (R$/unidade):</span>
            <input
              type="number" step="0.01" min="0"
              value={vtRate}
              onChange={e => handleRateChange("vt", parseFloat(e.target.value) || 0)}
              className="w-24 px-2 py-1 border border-green-300 bg-green-50 rounded-md focus:ring-2 focus:ring-green-400 outline-none text-sm font-semibold text-right"
            />
          </label>
        </div>
      </div>

      {/* Tabela de Benefícios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
        <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4 print:hidden bg-gray-50">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de Mês/Ano */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            </div>
            {/* Adicionar exceção */}
            <select
              value={selectedException}
              onChange={(e) => setSelectedException(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
            >
              <option value="">Selecione um funcionário...</option>
              {exceptions.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button
              onClick={handleAddException}
              disabled={!selectedException}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Adicionar Exceção
            </button>
          </div>
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="text-xs text-green-600 flex items-center gap-1 mr-2">
                <Check className="h-3.5 w-3.5" /> Salvo às {savedAt}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir Relatório
            </button>
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible w-full">
          {/* Observation Modal */}
          {observationModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in print:hidden">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Observações
                </h3>
                <textarea
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none text-black"
                  placeholder="Digite aqui as observações..."
                  value={observationModal.text}
                  onChange={e => setObservationModal(p => ({...p, text: e.target.value}))}
                />
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setObservationModal({isOpen: false, empId: "", text: ""})} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={() => {
                    handleUpdate(observationModal.empId, "observations", observationModal.text);
                    setObservationModal({isOpen: false, empId: "", text: ""});
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Salvar</button>
                </div>
              </div>
            </div>
          )}
          <table className="w-full text-sm text-left border-collapse print:text-xs">
            <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">
            <tr className="hidden print:table-row">
              <th colSpan={7} className="text-center py-4 text-xl font-bold uppercase text-black bg-white border-b-2 border-black">
                Relatório de Benefícios - {MONTHS[selectedMonth]} / {selectedYear}
              </th>
            </tr>
              <tr>
                <th className="px-4 py-3 border-r border-gray-300 w-12 text-center">Nº</th>
                <th className="px-4 py-3 border-r border-gray-300">FUNCIONÁRIO</th>
                <th className="px-4 py-3 border-r border-gray-300 w-24 text-center">VA UNID.</th>
                <th className="px-4 py-3 border-r border-gray-300 w-32 text-right">VALOR V.A. (R$)</th>
                <th className="px-4 py-3 border-r border-gray-300 w-24 text-center">VT UNID.</th>
                <th className="px-4 py-3 border-r border-gray-300 w-32 text-right">VALOR V.T. (R$)</th>
                <th className="px-4 py-3 w-48">OBSERVAÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 border-b border-gray-300">
              {data.map((emp, index) => (
                <tr key={emp.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="px-4 py-2 border-r border-gray-200 text-center text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 font-medium text-gray-900 truncate max-w-[250px]" title={emp.name}>
                    {emp.name}
                  </td>

                  {/* VA UNID */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    {emp.receivesVA ? (
                      <input
                        type="number"
                        value={emp.vaUnid}
                        onChange={(e) => handleUpdate(emp.id, "vaUnid", e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 text-center"
                      />
                    ) : (
                      <span className="block text-center text-gray-300 font-medium select-none">—</span>
                    )}
                  </td>

                  {/* VALOR V.A. */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    {emp.receivesVA ? (
                      <input
                        type="number" step="0.01"
                        value={emp.vaValue}
                        onChange={(e) => handleUpdate(emp.id, "vaValue", e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 text-right"
                      />
                    ) : (
                      <span className="block text-center text-gray-300 font-medium select-none">—</span>
                    )}
                  </td>

                  {/* VT UNID */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    {emp.receivesVT ? (
                      <input
                        type="number"
                        value={emp.vtUnid}
                        onChange={(e) => handleUpdate(emp.id, "vtUnid", e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 text-center"
                      />
                    ) : (
                      <span className="block text-center text-gray-300 font-medium select-none">—</span>
                    )}
                  </td>

                  {/* VALOR V.T. */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    {emp.receivesVT ? (
                      <input
                        type="number" step="0.01"
                        value={emp.vtValue}
                        onChange={(e) => handleUpdate(emp.id, "vtValue", e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 text-right"
                      />
                    ) : (
                      <span className="block text-center text-gray-300 font-medium select-none">—</span>
                    )}
                  </td>

                  {/* OBSERVAÇÕES */}
                  <td className="px-2 py-1 align-middle">
                    <div className="print:hidden flex justify-center">
                      <button
                        onClick={() => setObservationModal({isOpen: true, empId: emp.id, text: emp.observations || ""})}
                        className={`p-2 rounded-md transition-colors relative flex items-center justify-center ${emp.observations ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title={emp.observations || "Adicionar Observação"}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {emp.observations && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
                      </button>
                    </div>
                    <div className="hidden print:block text-[9px] text-black leading-tight break-words text-center">
                      {emp.observations}
                    </div>
                  </td>
                </tr>
              ))}

              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum funcionário CLT encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Printer, Calendar, Loader2, CheckCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { logActivity } from "@/actions/activity-log";
import { getAccountingReportData } from "@/actions/accounting-report";
import { saveAccountingReportEntries, getAccountingReportEntries } from "@/actions/accounting-report-db";
import { usePersistedMonthYear } from "@/hooks/usePersistedMonthYear";

interface EmployeeData {
  id: string;
  name: string;
  receivesNightHazard: boolean;
  workLocation: string;
  standardHours: string;
  intervalarValue: string;
}

interface RowState {
  atestado: string;
  faltas: string;
  descontos: string;
  intervalarValue: string;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AccountingReportClient({ initialData, initialMonth, initialYear }: { initialData: EmployeeData[], initialMonth: number, initialYear: number }) {
  const { month, year, setMonth, setYear } = usePersistedMonthYear(
    "relatorio-contabilidade",
    String(initialMonth + 1),
    String(initialYear)
  );

  const [data, setData] = useState<EmployeeData[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Estado local de todos os inputs editáveis, keyed by employeeId
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {};
    initialData.forEach(emp => {
      init[emp.id] = { atestado: "NÃO", faltas: "", descontos: "", intervalarValue: emp.intervalarValue };
    });
    return init;
  });

  const loadData = useCallback(async (m: number, y: number) => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const [result, dbEntries] = await Promise.all([
        getAccountingReportData(m, y),
        getAccountingReportEntries(m, y)
      ]);
      setData(result);
      // Inicializa novos funcionários no estado, preservando os que já existem
      setRowStates(prev => {
        const next: Record<string, RowState> = {};
        result.forEach(emp => {
          const dbEntry = dbEntries.find(e => e.employeeId === emp.id);
          if (dbEntry) {
            next[emp.id] = {
              atestado: dbEntry.atestado || "NÃO",
              faltas: prev[emp.id]?.faltas || dbEntry.faltas || "",
              descontos: prev[emp.id]?.descontos || dbEntry.descontos || "",
              intervalarValue: dbEntry.intervalarValue || emp.intervalarValue,
            };
          } else {
            next[emp.id] = prev[emp.id] ?? { atestado: "NÃO", faltas: "", descontos: "", intervalarValue: emp.intervalarValue };
          }
        });
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega quando mudar mês/ano
  useEffect(() => {
    loadData(month, year);
  }, [month, year, loadData]);

  const updateRow = (employeeId: string, field: keyof RowState, value: string) => {
    setHasChanges(true);
    setRowStates(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const entriesToSave = data.map(emp => {
        const row = rowStates[emp.id];
        return {
          employeeId: emp.id,
          ...row
        };
      });
      await saveAccountingReportEntries(month, year, entriesToSave);
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      setHasChanges(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasChanges, rowStates, month, year]);

  const handlePrint = () => {
    logActivity("IMPRESSAO_RELATORIO_CONTABILIDADE", `Mês/Ano: ${month + 1}/${year}`);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input[type="date"]::-webkit-calendar-picker-indicator { display: none !important; -webkit-appearance: none !important; }
          table, th, td { font-size: 10px !important; }
          th, td { padding: 4px !important; }
          input[type="date"] { width: 70px !important; font-size: 10px !important; }
          th.w-\\[200px\\] { width: 155px !important; }
        }
      `}} />

      <div className="p-4 border-b border-gray-200 flex justify-between items-center print:hidden bg-gray-50">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-400 h-5 w-5" />
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg w-32 justify-end">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-600 font-medium">Salvando...</span>
              </>
            ) : savedAt ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-400">Salvo às {savedAt}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Salvo</span>
            )}
          </div>
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
        <table className="w-full text-sm text-left border-collapse print:text-xs">
          <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">
            <tr className="hidden print:table-row">
              <th colSpan={8} className="text-center py-4 text-xl font-bold uppercase text-black bg-white border-b-2 border-black">
                Relatório de Fechamento - {MONTHS[month]} / {year}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-3 border-r border-gray-300">FUNCIONÁRIO</th>
              <th className="px-3 py-3 border-r border-gray-300 w-16 text-center">AD</th>
              <th className="px-3 py-3 border-r border-gray-300 w-24">ATESTADO</th>
              <th className="px-4 py-3 border-r border-gray-300">LOTAÇÃO</th>
              <th className="px-4 py-3 border-r border-gray-300">HORÁRIO DE TRABALHO</th>
              <th className="px-3 py-3 border-r border-gray-300 w-32">HORA INTERVALAR</th>
              <th className="px-3 py-3 border-r border-gray-300 w-[200px] text-center">FALTAS</th>
              <th className="px-3 py-3 w-[200px] text-center">DESCONTOS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 border-b border-gray-300">
            {data.map((emp) => {
              const row = rowStates[emp.id] ?? { atestado: "NÃO", faltas: "", descontos: "", intervalarValue: emp.intervalarValue };
              return (
                <tr key={emp.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="px-4 py-2 border-r border-gray-200 font-medium text-gray-900 truncate max-w-[200px]" title={emp.name}>
                    {emp.name}
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200 text-center font-bold">
                    {emp.receivesNightHazard ? (
                      <span className="text-red-600">SIM</span>
                    ) : (
                      <span className="text-gray-500">NÃO</span>
                    )}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200">
                    <select
                      value={row.atestado}
                      onChange={e => updateRow(emp.id, "atestado", e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0"
                    >
                      <option value="NÃO">NÃO</option>
                      <option value="SIM">SIM</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 text-gray-700 truncate max-w-[150px]" title={emp.workLocation}>
                    {emp.workLocation}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 text-gray-700 truncate max-w-[150px]" title={emp.standardHours}>
                    {emp.standardHours}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200">
                    {emp.intervalarValue === "NÃO" ? (
                      <span className="block text-center font-semibold text-gray-400 py-1">NÃO</span>
                    ) : (
                      <input
                        type="text"
                        value={row.intervalarValue}
                        onChange={e => updateRow(emp.id, "intervalarValue", e.target.value)}
                        onFocus={e => e.target.select()}
                        className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 print:focus:ring-0 text-center"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200 align-middle">
                    <input
                      type="text"
                      value={row.faltas}
                      onChange={e => updateRow(emp.id, "faltas", e.target.value)}
                      placeholder="Ex: 03 e 04, ou 05/07"
                      className="w-full text-xs bg-transparent border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                  </td>
                  <td className="px-2 py-1 align-middle">
                    <input
                      type="text"
                      value={row.descontos}
                      onChange={e => updateRow(emp.id, "descontos", e.target.value)}
                      placeholder="Ex: Dias 10, 11 e 12"
                      className="w-full text-xs bg-transparent border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                  </td>
                </tr>
              );
            })}

            {data.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Nenhum funcionário CLT encontrado para exibir no relatório.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

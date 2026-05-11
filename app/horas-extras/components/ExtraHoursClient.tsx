"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getOvertimeData,
  generateOvertimePreview,
  saveOvertimeRecords,
  toggleOvertimeStatus,
} from "@/actions/overtime";
import {
  Calendar, Save, Loader2, Printer, Sparkles,
  Check, RefreshCw
} from "lucide-react";
import { useSession } from "next-auth/react";
import { AlertModal } from "@/components/ui/AlertModal";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COMPANY_LABEL: Record<string, string> = {
  FALCON_SERVICE: "Falcon Service",
  FALCON_MONITORAMENTO: "Falcon Monitoramento",
  NAO_REGISTRADO: "Não Registrados",
};

type OvertimeRow = {
  id: string;
  employeeId: string;
  name: string;
  registrationCompany: string;
  effectiveRate: number;
  hours: number | string;
  totalValue: number;
  observations: string;
  status: string;
};

const inputBase =
  "w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded px-2 py-1 transition-all outline-none text-right font-medium print:border-none print:bg-transparent print:p-0 print:ring-0 print:appearance-none";

export default function ExtraHoursClient() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusTransition, startStatusTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  
  const [errorModal, setErrorModal] = useState<{isOpen: boolean; title: string; message: string}>({
    isOpen: false, title: "", message: ""
  });

  const { data: session } = useSession();
  const isAdminOrManager = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MANAGER";

  useEffect(() => { loadData(); }, [month, year]);

  const loadData = async () => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const data = await getOvertimeData(month, year);
      setRows(data as OvertimeRow[]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (id: string, field: keyof OvertimeRow, value: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      
      // Recalculate total if hours change
      if (field === "hours") {
        const h = parseFloat(updated.hours as string) || 0;
        const rate = Number(r.effectiveRate) || 0;
        updated.totalValue = h * rate;
      }
      
      return updated;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveOvertimeRecords(rows.map(r => ({
        id: r.id,
        hours: parseFloat(r.hours as string) || 0,
        totalValue: Number(r.totalValue) || 0,
        observations: r.observations || "",
      })));
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao salvar", message: "Não foi possível salvar as horas extras. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PENDENTE" ? "PAGO" : "PENDENTE";
    startStatusTransition(async () => {
      try {
        await toggleOvertimeStatus(id, newStatus);
        setRows(prev => prev.map(r => r.id !== id ? r : { ...r, status: newStatus }));
      } catch {
        setErrorModal({ isOpen: true, title: "Erro ao atualizar", message: "Não foi possível alterar o status do pagamento." });
      }
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateOvertimePreview(month, year);
      await loadData();
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao sincronizar", message: "Não foi possível sincronizar os registros. Tente novamente." });
    } finally {
      setIsGenerating(false);
    }
  };

  const grupos = [
    { key: "FALCON_SERVICE", rows: rows.filter(r => r.registrationCompany === "FALCON_SERVICE") },
    { key: "FALCON_MONITORAMENTO", rows: rows.filter(r => r.registrationCompany === "FALCON_MONITORAMENTO") },
    { key: "NAO_REGISTRADO", rows: rows.filter(r => r.registrationCompany === "NAO_REGISTRADO") },
  ].filter(g => g.rows.length > 0);

  const totalGeral = rows.reduce((a, r) => a + (Number(r.totalValue) || 0), 0);
  const totalPago = rows.filter(r => r.status === "PAGO").reduce((a, r) => a + (Number(r.totalValue) || 0), 0);

  const renderGroup = (groupKey: string, groupRows: OvertimeRow[]) => {
    const totalGroup = groupRows.reduce((a, r) => a + (Number(r.totalValue) || 0), 0);
    const paidInGroup = groupRows.filter(r => r.status === "PAGO").length;

    return (
      <div key={groupKey} className="print:break-inside-avoid mb-10">
        {/* Cabeçalho de seção moderno */}
        <div className="flex flex-wrap justify-between items-center mt-8 mb-3 pb-3 border-b border-gray-200 print:mt-4 print:mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800 print:text-base">
              {COMPANY_LABEL[groupKey]}
            </h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {groupRows.length} colaborador{groupRows.length !== 1 ? "es" : ""}
            </span>
            {paidInGroup === groupRows.length && groupRows.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Check className="h-3 w-3" /> Todos pagos
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <span className="bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
              Total Extras: R$ {totalGroup.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm print:shadow-none print:border print:border-black print:rounded-none">
          <table className="w-full text-left border-collapse print:text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:border-black print:bg-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Funcionário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Taxa/Base</th>
                <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-center text-orange-600 bg-orange-50/50">Qtd Horas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-right">Valor Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[150px]">Observações</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-center print:hidden">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupRows.map((r) => (
                <tr key={r.id} className={`transition-colors print:bg-transparent print:hover:bg-transparent ${r.status === "PAGO" ? "bg-green-50/60 hover:bg-green-100/60" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-2 border-r border-gray-100 font-medium text-gray-800">
                    <div className="truncate max-w-[160px] sm:max-w-[200px]" title={r.name}>
                      {r.name}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-100 text-right text-gray-500 text-sm">
                    R$ {r.effectiveRate.toFixed(2)}/h
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 bg-orange-50/30">
                    <input
                      type="number" step="0.5" min="0"
                      value={r.hours}
                      onChange={e => handleChange(r.id, "hours", e.target.value)}
                      className={`${inputBase} text-center`}
                    />
                  </td>
                  <td className="px-4 py-2 border-r border-gray-100 text-right font-bold text-gray-900 bg-slate-50/50">
                    R$ {r.totalValue.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100">
                    <input
                      type="text"
                      value={r.observations}
                      onChange={e => handleChange(r.id, "observations", e.target.value)}
                      placeholder="Motivo / Detalhes"
                      className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded px-2 py-1 transition-all outline-none text-xs text-gray-600 print:border-none print:p-0 print:bg-transparent print:appearance-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-center print:hidden">
                    {isAdminOrManager ? (
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${
                          r.status === "PAGO"
                            ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                            : "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                        }`}
                      >
                        {r.status}
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full border inline-block ${
                          r.status === "PAGO"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-orange-100 text-orange-700 border-orange-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AlertModal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
      />

      {/* ── Barra Superior (Filtros e Ações) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4 justify-between items-center print:border-none print:shadow-none print:p-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
            <Calendar className="h-4 w-4 text-gray-500 ml-2" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 outline-none cursor-pointer py-1"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <span className="text-gray-300">|</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 outline-none cursor-pointer py-1 pr-2"
            >
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {rows.length > 0 && (
            <div className="hidden md:flex gap-4 text-sm print:hidden border-l pl-4">
              <span className="text-gray-500">
                Total Geral: <strong className="text-gray-900">R$ {totalGeral.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                Pendente: <strong className="text-orange-600">R$ {(totalGeral - totalPago).toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedAt && (
            <span className="text-xs text-green-600 flex items-center gap-1 mr-1">
              <Check className="h-3.5 w-3.5" /> Salvo às {savedAt}
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          
          {/* Botão de sincronização (gera os que faltam) */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading}
            title="Sincroniza novos funcionários à tabela deste mês."
            className="flex items-center gap-2 border border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isGenerating ? "Sincronizando..." : "Sincronizar"}
          </button>

          {rows.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </button>
          )}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="px-6 pb-10">
        {isLoading && rows.length === 0 ? (
          <div className="flex justify-center items-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center gap-5">
            <div className="bg-orange-50 p-5 rounded-full">
              <Sparkles className="h-12 w-12 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Nenhum registro no período</h2>
              <p className="text-gray-400 mt-2 max-w-sm text-sm">
                Inicie a apuração de horas extras gerando os registros em branco para todos os colaboradores ativos.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
            >
              {isGenerating
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando...</>
                : <><Sparkles className="h-5 w-5" /> Gerar Registros do Mês</>
              }
            </button>
          </div>
        ) : (
          <div>
            <div className="hidden print:block text-center mt-4 mb-6">
              <h1 className="text-xl font-bold uppercase tracking-wide">Apuração de Horas Extras — {MONTHS[month]} / {year}</h1>
            </div>
            {grupos.map(g => renderGroup(g.key, g.rows))}
          </div>
        )}
      </div>
    </div>
  );
}

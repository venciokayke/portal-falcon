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
  Check, RefreshCw, CheckCircle2, ShieldCheck,
  Send, ClipboardCheck, Ban, MessageSquare
} from "lucide-react";
import { useSession } from "next-auth/react";
import { AlertModal } from "@/components/ui/AlertModal";
import {
  getPayrollStatus,
  submitPayroll,
  approvePayroll,
  rejectPayroll,
} from "@/actions/payroll-status";
import { logActivity } from "@/actions/activity-log";
import Link from "next/link";

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
  approvedBy?: string | null;
  approvedAt?: string | null;
};

const inputBase =
  "w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 transition-all outline-none text-right font-medium print:border-none print:bg-transparent print:p-0 print:ring-0 print:appearance-none";

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

  const [sheetStatus, setSheetStatus] = useState<{
    status: string;
    sentAt: string | null;
    sentBy: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
  }>({
    status: "EM_DIGITACAO",
    sentAt: null,
    sentBy: null,
    approvedAt: null,
    approvedBy: null,
  });
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false, title: "", message: ""
  });
  const [observationModal, setObservationModal] = useState<{isOpen: boolean; rowId: string; text: string}>({isOpen: false, rowId: "", text: ""});

  const { data: session } = useSession();
  const isAdminOrManager = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MANAGER";

  const canEdit = isAdminOrManager || (sheetStatus.status === "EM_DIGITACAO");

  useEffect(() => { loadData(); }, [month, year]);

  const loadData = async () => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const [data, statusData] = await Promise.all([
        getOvertimeData(month, year),
        getPayrollStatus(month, year),
      ]);
      setRows(data as OvertimeRow[]);
      setSheetStatus(statusData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsStatusChanging(true);
    try {
      await submitPayroll(month, year);
      await loadData();
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao enviar", message: "Não foi possível enviar a folha para análise." });
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleApprove = async () => {
    setIsStatusChanging(true);
    try {
      await approvePayroll(month, year);
      await loadData();
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao aprovar", message: "Não foi possível aprovar a folha." });
    } finally {
      setIsStatusChanging(false);
    }
  };

  const handleReject = async () => {
    setIsStatusChanging(true);
    try {
      await rejectPayroll(month, year);
      await loadData();
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao recusar", message: "Não foi possível devolver a folha para correção." });
    } finally {
      setIsStatusChanging(false);
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
        setRows(prev => prev.map(r => r.id !== id ? r : {
          ...r,
          status: newStatus,
          approvedBy: newStatus === "PAGO" ? (session?.user?.name ?? "você") : null,
          approvedAt: newStatus === "PAGO" ? new Date().toISOString() : null,
        }));
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

  const handlePrint = () => {
    logActivity("IMPRESSAO_HORAS_EXTRAS", `Mês/Ano: ${month + 1}/${year}`);
    setTimeout(() => {
      window.print();
    }, 100);
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
            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
              Total Extras: R$ {totalGroup.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
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
                <button onClick={() => setObservationModal({isOpen: false, rowId: "", text: ""})} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={() => {
                  handleChange(observationModal.rowId, "observations", observationModal.text);
                  setObservationModal({isOpen: false, rowId: "", text: ""});
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Salvar</button>
              </div>
            </div>
          </div>
        )}
          <table className="w-full text-left border-collapse print:text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:border-black print:bg-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Funcionário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Taxa/Base</th>
                <th className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-center text-blue-600 bg-blue-50/50">Qtd Horas</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-right">Valor Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[150px]">Observações</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-center print:hidden">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 print:hidden">Aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupRows.map((r) => (
                <tr key={r.id} className={`border-b border-gray-100 transition-colors print:border-black ${r.status === "PAGO" ? "bg-green-50/60 print:bg-transparent" : "bg-white hover:bg-gray-50/70"}`}>
                  <td className="px-4 py-3 border-r border-gray-100">
                    <div className="truncate max-w-[160px] sm:max-w-[200px] inline-flex items-center gap-1.5" title={r.name}>
                      <Link href={`/ponto/${r.employeeId}?month=${month + 1}&year=${year}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-sm">{r.name}</Link>
                      {r.status === "PAGO" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 print:hidden" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-100 text-right text-gray-500 text-sm">
                    R$ {r.effectiveRate.toFixed(2)}/h
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 bg-blue-50/30">
                    <input
                      type="number" step="0.5" min="0"
                      value={r.hours}
                      onChange={e => handleChange(r.id, "hours", e.target.value)}
                      disabled={r.status === "PAGO" || !canEdit}
                      className={`${inputBase} text-center disabled:text-gray-400 disabled:cursor-not-allowed`}
                    />
                  </td>
                  <td className="px-4 py-2 border-r border-gray-100 text-right font-bold text-gray-900 bg-slate-50/50">
                    R$ {r.totalValue.toFixed(2)}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-100 align-middle">
                    <div className="print:hidden flex justify-center">
                      <button
                        onClick={() => setObservationModal({isOpen: true, rowId: r.id, text: r.observations || ""})}
                        disabled={r.status === "PAGO" || !canEdit}
                        className={`p-2 rounded-md transition-colors relative flex items-center justify-center ${r.observations ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={r.observations || "Adicionar Observação"}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {r.observations && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
                      </button>
                    </div>
                    <div className="hidden print:block text-[9px] text-black leading-tight break-words text-center">
                      {r.observations}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center print:hidden">
                    {isAdminOrManager ? (
                      <button
                        onClick={() => handleToggleStatus(r.id, r.status)}
                        disabled={statusTransition}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200 disabled:opacity-50 ${r.status === "PAGO"
                          ? "bg-green-500 text-white border-transparent shadow-sm shadow-green-200 hover:bg-green-600"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                      >
                        {r.status === "PAGO"
                          ? <><Check className="h-4 w-4" /> Pago</>
                          : <><span className="h-4 w-4 rounded-full border-2 border-gray-300 inline-block" /> Pagar</>
                        }
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${r.status === "PAGO"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                      >
                        {r.status === "PAGO"
                          ? <><Check className="h-4 w-4" /> Pago</>
                          : <>Pendente</>
                        }
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 print:hidden">
                    {r.status === "PAGO" && r.approvedBy ? (
                      <div className="flex items-start gap-1.5 text-left">
                        <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-medium text-green-700">
                            {r.approvedBy === session?.user?.name || r.approvedBy === "você" ? "você" : r.approvedBy}
                          </div>
                          {r.approvedAt && (
                            <div className="text-[10px] text-gray-400">
                              {new Date(r.approvedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
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
    <div className="flex flex-col bg-white min-h-full">
      <AlertModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
      />
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body, html, #__next, main, .min-h-screen { min-height: 0 !important; height: auto !important; }
          input { border: none !important; background: transparent !important; padding: 2px 0 !important; box-shadow: none !important; appearance: none; -webkit-appearance: none; }
          input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          input::placeholder { color: transparent !important; }
        }
      `}} />

      {/* ── Banner de Status do Fluxo de Aprovação ── */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status da Folha:</span>
          {sheetStatus.status === "EM_DIGITACAO" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              Em Digitação
            </span>
          )}
          {sheetStatus.status === "ENVIADO" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              Aguardando Aprovação do Gestor
            </span>
          )}
          {sheetStatus.status === "APROVADO" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              Aprovado
            </span>
          )}
          
          <span className="text-xs text-gray-500 font-medium">
            {sheetStatus.status === "ENVIADO" && sheetStatus.sentBy && (
              <>Enviado por <strong>{sheetStatus.sentBy}</strong> em {new Date(sheetStatus.sentAt!).toLocaleString("pt-BR")}</>
            )}
            {sheetStatus.status === "APROVADO" && sheetStatus.approvedBy && (
              <>Aprovado por <strong>{sheetStatus.approvedBy}</strong> em {new Date(sheetStatus.approvedAt!).toLocaleString("pt-BR")}</>
            )}
          </span>
        </div>

        {/* Botões de Ação de Fluxo */}
        <div className="flex items-center gap-2">
          {isStatusChanging && <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />}
          
          {/* Operador: botão para Enviar */}
          {!isAdminOrManager && sheetStatus.status === "EM_DIGITACAO" && (
            <button
              onClick={handleSubmit}
              disabled={isStatusChanging || isLoading || rows.length === 0}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Enviar para Análise
            </button>
          )}

          {/* Gestor: botões para Aprovar / Devolver */}
          {isAdminOrManager && sheetStatus.status === "ENVIADO" && (
            <>
              <button
                onClick={handleReject}
                disabled={isStatusChanging || isLoading}
                className="flex items-center gap-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Devolver para Correção
              </button>
              <button
                onClick={handleApprove}
                disabled={isStatusChanging || isLoading}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Aprovar Folha
              </button>
            </>
          )}

          {/* Gestor: possibilidade de reabrir se aprovado */}
          {isAdminOrManager && sheetStatus.status === "APROVADO" && (
            <button
              onClick={handleReject}
              disabled={isStatusChanging || isLoading}
              className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
            >
              Reabrir para Edição
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="text-gray-400 h-5 w-5 shrink-0" />
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}

          {rows.length > 0 && (
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {rows.filter(r => r.status === "PAGO").length}/{rows.length} pagos
              </span>
              <span className="text-xs text-gray-500">
                Total: <strong className="text-gray-800">R$ {totalGeral.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500">
                Pago: <strong className="text-green-700">R$ {totalPago.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500">
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
            onClick={handlePrint}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>

          {rows.length > 0 && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isLoading || !canEdit}
              title="Adiciona novos colaboradores cadastrados ao período atual sem perder dados existentes."
              className="flex items-center gap-2 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isGenerating ? "Sincronizando..." : "Sincronizar"}
            </button>
          )}

          {rows.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading || !canEdit}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
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
            <div className="bg-blue-50 p-5 rounded-full">
              <Sparkles className="h-12 w-12 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Nenhum registro no período</h2>
              <p className="text-gray-400 mt-2 max-w-sm text-sm">
                Inicie a apuração de horas extras gerando os registros em branco para todos os colaboradores ativos.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !canEdit}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
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

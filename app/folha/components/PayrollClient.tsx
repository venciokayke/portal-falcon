"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePersistedMonthYear } from "@/hooks/usePersistedMonthYear";
import {
  getMonthlyPayrolls,
  generateMonthPreview,
  saveAllMonthlyPayrolls,
  togglePaymentStatus,
} from "@/actions/monthly-payroll";
import {
  Calendar, Save, Loader2, Printer, Sparkles,
  CheckCircle2, Check, ShieldCheck, TrendingUp, TrendingDown,
  RefreshCw, Send, ClipboardCheck, Ban, MessageSquare, UserPlus, X,
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

type PayrollRow = {
  id: string;
  employeeId: string;
  name: string;
  registrationCompany: string;
  pixKey: string | null;
  pixType: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  receivesVT: boolean;
  contractType: string;
  baseValue: number;
  extras: number;
  vtValue: number;
  discounts: number;
  total: number;
  observations: string;
  isPaid: boolean;
  paidAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
};

// Classes compartilhadas dos inputs na tela vs impressão
const inputBase =
  "w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 transition-all outline-none text-right print:border-none print:bg-transparent print:p-0 print:ring-0 print:appearance-none";

type GuestRow = {
  id: string;
  name: string;
  baseValue: number;
  extras: number;
  vtValue: number;
  discounts: number;
  observations: string;
};

export default function PayrollClient() {
  const searchParams = useSearchParams();
  const currentDate = new Date();
  const { month, year, setMonth, setYear } = usePersistedMonthYear(
    "folha",
    searchParams.get("month"),
    searchParams.get("year")
  );
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [anonymousPrint, setAnonymousPrint] = useState(false);
  const [pendingPaid, startPaidTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false, title: "", message: ""
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Estado das linhas avulsas (locais, sem persistência no banco)
  const [guestRows, setGuestRows] = useState<GuestRow[]>([]);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: "", baseValue: "", extras: "", vtValue: "", discounts: "", observations: "" });

  const [observationModal, setObservationModal] = useState<{isOpen: boolean; rowId: string; isGuest: boolean; text: string}>({isOpen: false, rowId: "", isGuest: false, text: ""});

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

  const { data: session } = useSession();
  const isAdminOrManager = (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "MANAGER";

  const canEdit = isAdminOrManager || (sheetStatus.status === "EM_DIGITACAO");

  useEffect(() => { loadData(); }, [month, year]);

  const loadData = async () => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const [data, statusData] = await Promise.all([
        getMonthlyPayrolls(month, year),
        getPayrollStatus(month, year),
      ]);
      setRows(data as PayrollRow[]);
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

  const handleChange = (id: string, field: keyof PayrollRow, value: string) => {
    setHasChanges(true);
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      updated.total = (Number(updated.baseValue) || 0) + (Number(updated.extras) || 0) + (Number(updated.vtValue) || 0) - (Number(updated.discounts) || 0);
      return updated;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveAllMonthlyPayrolls(rows.map(r => ({
        id: r.id,
        baseValue: Number(r.baseValue) || 0,
        extras: Number(r.extras) || 0,
        vtValue: Number(r.vtValue) || 0,
        discounts: Number(r.discounts) || 0,
        observations: r.observations || "",
      })));
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      setHasChanges(false);
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao salvar", message: "Ocorreu um erro ao salvar o fechamento. Tente novamente." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePaid = (id: string, currentPaid: boolean) => {
    startPaidTransition(async () => {
      try {
        await togglePaymentStatus(id, !currentPaid);
        setRows(prev => prev.map(r => r.id !== id ? r : {
          ...r,
          isPaid: !currentPaid,
          approvedBy: !currentPaid ? (session?.user?.name ?? "você") : null,
          approvedAt: !currentPaid ? new Date().toISOString() : null,
        }));
      } catch {
        setErrorModal({ isOpen: true, title: "Erro ao atualizar", message: "Ocorreu um erro ao atualizar o status." });
      }
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateMonthPreview(month, year);
      await loadData();
    } catch {
      setErrorModal({ isOpen: true, title: "Erro ao gerar prévia", message: "Ocorreu um erro ao calcular os valores da folha." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    logActivity("IMPRESSAO_FECHAMENTO_FOLHA", `Mês/Ano: ${month + 1}/${year}`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasChanges, rows]);

  const grupos = [
    { key: "FALCON_SERVICE", rows: rows.filter(r => r.registrationCompany === "FALCON_SERVICE") },
    { key: "FALCON_MONITORAMENTO", rows: rows.filter(r => r.registrationCompany === "FALCON_MONITORAMENTO") },
    { key: "NAO_REGISTRADO", rows: rows.filter(r => r.registrationCompany === "NAO_REGISTRADO") },
  ].filter(g => g.rows.length > 0);

  const totalAPagar = [
    ...rows,
    ...guestRows.map(g => ({ baseValue: g.baseValue, extras: g.extras, vtValue: g.vtValue, discounts: g.discounts, isPaid: false })),
  ].reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
  const totalPago = rows.filter(r => r.isPaid).reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
  const paidCount = rows.filter(r => r.isPaid).length;

  const handleAddGuest = () => {
    if (!guestForm.name.trim()) return;
    const newGuest: GuestRow = {
      id: `guest-${Date.now()}`,
      name: guestForm.name.trim().toUpperCase(),
      baseValue: Number(guestForm.baseValue) || 0,
      extras: Number(guestForm.extras) || 0,
      vtValue: Number(guestForm.vtValue) || 0,
      discounts: Number(guestForm.discounts) || 0,
      observations: guestForm.observations,
    };
    setGuestRows(prev => [...prev, newGuest]);
    setGuestForm({ name: "", baseValue: "", extras: "", vtValue: "", discounts: "", observations: "" });
    setGuestModalOpen(false);
  };

  const handleGuestChange = (id: string, field: keyof GuestRow, value: string) => {
    setGuestRows(prev => prev.map(g => {
      if (g.id !== id) return g;
      return { ...g, [field]: value };
    }));
  };

  const renderGroup = (groupKey: string, groupRows: PayrollRow[]) => {
    const totalGroup = groupRows.reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
    const totalBase = groupRows.reduce((a, r) => a + (Number(r.baseValue) || 0), 0);
    const totalExtras = groupRows.reduce((a, r) => a + (Number(r.extras) || 0), 0);
    const totalVT = groupRows.reduce((a, r) => a + (Number(r.vtValue) || 0), 0);
    const totalDesc = groupRows.reduce((a, r) => a + (Number(r.discounts) || 0), 0);
    const paidInGroup = groupRows.filter(r => r.isPaid).length;

    return (
      <div key={groupKey} className="print:break-inside-avoid">
        {/* ── Cabeçalho de seção moderno ── */}
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
            <span className="bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap tabular-nums">
              Total: R$ {totalGroup.toFixed(2)}
            </span>
            <span className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-xs whitespace-nowrap tabular-nums print:hidden">
              Base: R$ {totalBase.toFixed(2)}
            </span>
            {totalExtras > 0 && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs whitespace-nowrap tabular-nums print:hidden">
                Extras: R$ {totalExtras.toFixed(2)}
              </span>
            )}
            {totalVT > 0 && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs whitespace-nowrap tabular-nums print:hidden">
                VT: R$ {totalVT.toFixed(2)}
              </span>
            )}
            {totalDesc > 0 && (
              <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs whitespace-nowrap tabular-nums print:hidden">
                Desc.: R$ {totalDesc.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabela ── */}
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
                  <button onClick={() => setObservationModal({isOpen: false, rowId: "", isGuest: false, text: ""})} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={() => {
                    if (observationModal.isGuest) {
                      handleGuestChange(observationModal.rowId, "observations", observationModal.text);
                    } else {
                      handleChange(observationModal.rowId, "observations", observationModal.text);
                    }
                    setObservationModal({isOpen: false, rowId: "", isGuest: false, text: ""});
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Salvar</button>
                </div>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print:text-[10px]">
              <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:border-black print:bg-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Funcionário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Dados de Pagamento</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[110px] text-right">Valor a Pagar</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-right">Base / Salário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-right">Valores Extras</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-right">Vale Transp.</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-right">Descontos</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Observações</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px] text-center print:hidden">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px] print:hidden">Aprovação</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((row) => {
                const rowTotal = (Number(row.baseValue) || 0) + (Number(row.extras) || 0) - (Number(row.discounts) || 0);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 transition-colors print:border-black ${row.isPaid
                      ? "bg-green-50/60 print:bg-transparent"
                      : "bg-white hover:bg-gray-50/70"
                      }`}
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <Link href={`/ponto/${row.employeeId}?month=${month + 1}&year=${year}`} className={`font-medium text-gray-900 hover:text-blue-600 hover:underline text-sm ${anonymousPrint ? "print:hidden" : ""}`}>{row.name}</Link>
                      {anonymousPrint && <span className="hidden print:inline font-medium text-gray-500 text-sm">Colaborador {row.id.substring(0,5).toUpperCase()}</span>}
                      {row.isPaid && (
                        <CheckCircle2 className="inline h-3.5 w-3.5 text-green-500 ml-1.5 print:hidden" />
                      )}
                    </td>

                    {/* Dados de Pagamento */}
                    <td className="px-4 py-3">
                      {row.paymentMethod === "PIX" && (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-blue-600 uppercase">PIX</span>
                          <span className="text-xs text-gray-900 font-medium">{row.pixKey || "—"}</span>
                          <span className="text-[10px] text-gray-400">({row.pixType || "—"})</span>
                        </div>
                      )}
                      {row.paymentMethod === "BANCARIA" && (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-purple-600 uppercase">Transferência</span>
                          <span className="text-xs text-gray-900 font-medium">{row.bankName || "—"}</span>
                          <span className="text-[10px] text-gray-500">
                            Ag: {row.bankAgency || "—"} | CC: {row.bankAccount || "—"}
                          </span>
                        </div>
                      )}
                      {row.paymentMethod === "ESPECIE" && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded uppercase">
                          Em Dinheiro (Espécie)
                        </span>
                      )}
                      {!row.paymentMethod && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Valor a Pagar */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-md text-gray-900 whitespace-nowrap tabular-nums">
                        R$ {rowTotal.toFixed(2)}
                      </span>
                    </td>

                    {/* Base */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.baseValue}
                        onChange={e => handleChange(row.id, "baseValue", e.target.value)}
                        onFocus={e => e.target.select()}
                        disabled={row.isPaid || !canEdit}
                        className={`${inputBase} disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Extras */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.extras}
                        onChange={e => handleChange(row.id, "extras", e.target.value)}
                        onFocus={e => e.target.select()}
                        disabled={row.isPaid || !canEdit}
                        className={`${inputBase} text-blue-700 focus:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Vale Transporte */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={!row.receivesVT ? 0 : row.vtValue}
                        onChange={e => handleChange(row.id, "vtValue", e.target.value)}
                        onFocus={e => e.target.select()}
                        disabled={row.isPaid || !row.receivesVT || !canEdit}
                        className={`${inputBase} ${!row.receivesVT
                          ? 'bg-gray-200 cursor-not-allowed text-transparent border-transparent print:hidden'
                          : 'text-blue-700 focus:text-blue-800'
                          } disabled:text-gray-400`}
                      />
                    </td>

                    {/* Descontos */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.discounts}
                        onChange={e => handleChange(row.id, "discounts", e.target.value)}
                        onFocus={e => e.target.select()}
                        disabled={row.isPaid || !canEdit}
                        className={`${inputBase} text-red-600 focus:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Observações */}
                    <td className="px-2 py-2 print:px-1 print:py-1">
                      <div className="print:hidden flex justify-center">
                        <button
                          onClick={() => setObservationModal({isOpen: true, rowId: row.id, isGuest: false, text: row.observations || ""})}
                          disabled={row.isPaid || !canEdit}
                          className={`p-2 rounded-md transition-colors relative flex items-center justify-center ${row.observations ? 'text-blue-600 bg-blue-100 hover:bg-blue-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={row.observations || "Adicionar Observação"}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {row.observations && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>}
                        </button>
                      </div>
                      <div className="hidden print:block text-[9px] text-black leading-tight break-words">
                        {row.observations}
                      </div>
                    </td>

                    {/* Status (toggle) */}
                    <td className="px-4 py-3 text-center print:hidden">
                      {isAdminOrManager ? (
                        <button
                          onClick={() => handleTogglePaid(row.id, row.isPaid)}
                          disabled={pendingPaid}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200 disabled:opacity-50 ${row.isPaid
                            ? "bg-green-500 text-white border-transparent shadow-sm shadow-green-200 hover:bg-green-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                            }`}
                        >
                          {row.isPaid
                            ? <><Check className="h-4 w-4" /> Pago</>
                            : <><span className="h-4 w-4 rounded-full border-2 border-gray-300 inline-block" /> Pagar</>
                          }
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${row.isPaid
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                        >
                          {row.isPaid
                            ? <><Check className="h-4 w-4" /> Pago</>
                            : <>Pendente</>
                          }
                        </span>
                      )}
                    </td>

                    {/* Aprovação */}
                    <td className="px-4 py-3 print:hidden">
                      {row.isPaid && row.approvedBy ? (
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-green-700">
                              {row.approvedBy === session?.user?.name || row.approvedBy === "você" ? "você" : row.approvedBy}
                            </div>
                            {row.approvedAt && (
                              <div className="text-[10px] text-gray-400">
                                {new Date(row.approvedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

      {/* ── Modal Avulso ── */}
      {guestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setGuestModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Adicionar Colaborador Avulso
              </h3>
              <button type="button" onClick={() => setGuestModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">&times;</button>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Linha temporária — não é salva no banco. Use para pagamentos pontuais sem cadastro.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={guestForm.name}
                  onChange={e => setGuestForm(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  placeholder="Ex: MARIA OLIVEIRA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base / Salário</label>
                  <input type="number" step="0.01" min="0" value={guestForm.baseValue} onChange={e => setGuestForm(p => ({ ...p, baseValue: e.target.value }))} onFocus={e => e.target.select()} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm text-right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extras</label>
                  <input type="number" step="0.01" min="0" value={guestForm.extras} onChange={e => setGuestForm(p => ({ ...p, extras: e.target.value }))} onFocus={e => e.target.select()} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm text-right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vale Transporte</label>
                  <input type="number" step="0.01" min="0" value={guestForm.vtValue} onChange={e => setGuestForm(p => ({ ...p, vtValue: e.target.value }))} onFocus={e => e.target.select()} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm text-right" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descontos</label>
                  <input type="number" step="0.01" min="0" value={guestForm.discounts} onChange={e => setGuestForm(p => ({ ...p, discounts: e.target.value }))} onFocus={e => e.target.select()} placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm text-right" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <input type="text" value={guestForm.observations} onChange={e => setGuestForm(p => ({ ...p, observations: e.target.value }))} onFocus={e => e.target.select()} placeholder="Ex: Serviço prestado em 01/07" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setGuestModalOpen(false)} className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors">Cancelar</button>
              <button type="button" onClick={handleAddGuest} disabled={!guestForm.name.trim()} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          body, html, #__next, main, .min-h-screen { min-height: 0 !important; height: auto !important; }
          input { border: none !important; background: transparent !important; padding: 2px 0 !important; box-shadow: none !important; appearance: none; -webkit-appearance: none; }
          input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          input::placeholder { color: transparent !important; }
          /* Economia de tinta: remove fundos e sombras */
          thead, tbody tr { background-color: white !important; }
          th { background-color: #f3f4f6 !important; }
          * { box-shadow: none !important; }
          /* Bordas finas */
          table, th, td { border-color: #888 !important; }
          /* Remove badges/pills coloridos */
          span[class*="bg-green"], span[class*="bg-blue"], span[class*="bg-amber"],
          span[class*="bg-red"], span[class*="bg-gray"] { background: transparent !important; color: black !important; border: none !important; padding: 0 !important; }
          /* Compacta padding */
          td, th { padding-top: 2px !important; padding-bottom: 2px !important; }
        }
      `}} />

      {/* ── Banner de Status do Fluxo de Aprovação ── */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Status da Folha:</span>
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
        <div className="flex items-center flex-wrap gap-2 shrink-0">
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
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Calendar className="text-gray-400 h-5 w-5 shrink-0" />
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
          <Link
            href={`/horas-extras?month=${month + 1}&year=${year}`}
            className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            title="Ir para Horas Extras"
          >
            Horas Extras
          </Link>

          {/* KPIs inline */}
          {rows.length > 0 && (
            <div className="flex items-center gap-x-3 gap-y-1 ml-1 flex-wrap">
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {paidCount}/{rows.length} pagos
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Total: <strong className="text-gray-800 tabular-nums">R$ {totalAPagar.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Pago: <strong className="text-green-700 tabular-nums">R$ {totalPago.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                Pendente: <strong className="text-orange-600 tabular-nums">R$ {(totalAPagar - totalPago).toFixed(2)}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-nowrap shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isLoading || !canEdit}
            title="Adiciona à folha funcionários que foram cadastrados após a geração da prévia. Não sobrescreve dados já editados."
            className="flex items-center gap-2 border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
            {isGenerating ? "Sincronizando..." : "Sincronizar"}
          </button>
          
          <button
            onClick={() => setGuestModalOpen(true)}
            disabled={isLoading}
            title="Adicionar colaborador avulso (sem cadastro) à folha"
            className="flex items-center gap-2 border border-dashed border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Avulso
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap shrink-0 ml-2">
            <input type="checkbox" checked={anonymousPrint} onChange={e => setAnonymousPrint(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            Ocultar Nomes
          </label>

          <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg justify-end shrink-0 whitespace-nowrap">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                <span className="text-sm text-blue-600 font-medium">Salvando...</span>
              </>
            ) : savedAt ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-sm text-gray-400">Salvo às {savedAt}</span>
              </>
            ) : (
              <span className="text-sm text-gray-400">Salvo</span>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap"
          >
            <Printer className="h-4 w-4 shrink-0" /> Imprimir
          </button>
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
              <h2 className="text-xl font-bold text-gray-800">Nenhuma prévia gerada</h2>
              <p className="text-gray-400 mt-2 max-w-sm text-sm">
                Gere a prévia do mês para criar os registros com valores pré-calculados para todos os colaboradores ativos.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50"
            >
              {isGenerating
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando...</>
                : <><Sparkles className="h-5 w-5" /> Gerar Prévia do Mês</>
              }
            </button>
          </div>
        ) : (
          <div>
            {/* Cabeçalho de impressão */}
            <div className="hidden print:block text-center mt-4 mb-6">
              <h1 className="text-xl font-bold uppercase tracking-wide">Fechamento de Folha — {MONTHS[month]} / {year}</h1>
            </div>
            {grupos.map(g => renderGroup(g.key, g.rows))}

            {/* ── Linhas Avulsas ── */}
            {guestRows.length > 0 && (
              <div className="print:break-inside-avoid">
                <div className="flex flex-wrap justify-between items-center mt-8 mb-3 pb-3 border-b border-amber-200 print:mt-4 print:mb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-amber-700 print:text-base">Avulsos</h2>
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      {guestRows.length} linha{guestRows.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] italic text-gray-400 print:hidden">Não salvo no banco</span>
                  </div>
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap tabular-nums">
                    Total: R$ {guestRows.reduce((a, g) => a + g.baseValue + g.extras + g.vtValue - g.discounts, 0).toFixed(2)}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-amber-100 shadow-sm print:shadow-none print:border print:border-black print:rounded-none">
                  <table className="w-full text-left border-collapse print:text-[10px]">
                    <thead>
                      <tr className="bg-amber-50 border-b border-amber-200 print:border-black print:bg-gray-100">
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[160px]">Funcionário</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[110px] text-right">Valor a Pagar</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[100px] text-right">Base</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[100px] text-right">Extras</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[100px] text-right">VT</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[100px] text-right">Descontos</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider min-w-[140px]">Observações</th>
                        <th className="px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider w-12 text-center print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {guestRows.map(g => {
                        const total = g.baseValue + g.extras + g.vtValue - g.discounts;
                        return (
                          <tr key={g.id} className="border-b border-amber-50 bg-white hover:bg-amber-50/40 print:border-black">
                            <td className="px-4 py-3">
                              <span className="font-medium text-gray-900 text-sm">{g.name}</span>
                              <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold uppercase print:hidden">Avulso</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-gray-900 whitespace-nowrap tabular-nums">R$ {total.toFixed(2)}</span>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-sm text-gray-700">{g.baseValue > 0 ? g.baseValue.toFixed(2) : "—"}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-sm text-blue-700">{g.extras > 0 ? g.extras.toFixed(2) : "—"}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-sm text-gray-700">{g.vtValue > 0 ? g.vtValue.toFixed(2) : "—"}</td>
                            <td className="px-2 py-2 text-right tabular-nums text-sm text-red-600">{g.discounts > 0 ? g.discounts.toFixed(2) : "—"}</td>
                            <td className="px-2 py-2 text-sm text-gray-500">{g.observations || "—"}</td>
                            <td className="px-2 py-2 text-center print:hidden">
                              <button onClick={() => setGuestRows(prev => prev.filter(r => r.id !== g.id))} className="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="Remover">
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

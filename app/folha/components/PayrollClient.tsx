"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getMonthlyPayrolls,
  generateMonthPreview,
  saveAllMonthlyPayrolls,
  togglePaymentStatus,
} from "@/actions/monthly-payroll";
import {
  Calendar, Save, Loader2, Printer, Sparkles,
  CheckCircle2, Check, ShieldCheck, TrendingUp, TrendingDown,
} from "lucide-react";

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

export default function PayrollClient() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPaid, startPaidTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [month, year]);

  const loadData = async () => {
    setIsLoading(true);
    setSavedAt(null);
    try {
      const data = await getMonthlyPayrolls(month, year);
      setRows(data as PayrollRow[]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (id: string, field: keyof PayrollRow, value: string) => {
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
    } catch {
      alert("Erro ao salvar.");
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
          approvedBy: !currentPaid ? "você" : null,
          approvedAt: !currentPaid ? new Date().toISOString() : null,
        }));
      } catch {
        alert("Erro ao atualizar status.");
      }
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateMonthPreview(month, year);
      await loadData();
    } catch {
      alert("Erro ao gerar prévia.");
    } finally {
      setIsGenerating(false);
    }
  };

  const grupos = [
    { key: "FALCON_SERVICE", rows: rows.filter(r => r.registrationCompany === "FALCON_SERVICE") },
    { key: "FALCON_MONITORAMENTO", rows: rows.filter(r => r.registrationCompany === "FALCON_MONITORAMENTO") },
    { key: "NAO_REGISTRADO", rows: rows.filter(r => r.registrationCompany === "NAO_REGISTRADO") },
  ].filter(g => g.rows.length > 0);

    const totalAPagar = rows.reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
    const totalPago = rows.filter(r => r.isPaid).reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
    const paidCount = rows.filter(r => r.isPaid).length;
  
    const renderGroup = (groupKey: string, groupRows: PayrollRow[]) => {
      const totalGroup   = groupRows.reduce((a, r) => a + (Number(r.baseValue) + Number(r.extras) + Number(r.vtValue) - Number(r.discounts)), 0);
      const totalBase    = groupRows.reduce((a, r) => a + (Number(r.baseValue) || 0), 0);
      const totalExtras  = groupRows.reduce((a, r) => a + (Number(r.extras) || 0), 0);
      const totalVT      = groupRows.reduce((a, r) => a + (Number(r.vtValue) || 0), 0);
      const totalDesc    = groupRows.reduce((a, r) => a + (Number(r.discounts) || 0), 0);
      const paidInGroup  = groupRows.filter(r => r.isPaid).length;

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
            <span className="bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
              Total: R$ {totalGroup.toFixed(2)}
            </span>
            <span className="bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-xs whitespace-nowrap print:hidden">
              Base: R$ {totalBase.toFixed(2)}
            </span>
            {totalExtras > 0 && (
              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs whitespace-nowrap print:hidden">
                Extras: R$ {totalExtras.toFixed(2)}
              </span>
            )}
            {totalVT > 0 && (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs whitespace-nowrap print:hidden">
                VT: R$ {totalVT.toFixed(2)}
              </span>
            )}
            {totalDesc > 0 && (
              <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs whitespace-nowrap print:hidden">
                Desc.: R$ {totalDesc.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabela ── */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm print:shadow-none print:border print:border-black print:rounded-none">
          <table className="w-full text-left border-collapse print:text-[10px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 print:border-black print:bg-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">Funcionário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Dados de Pagamento</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 text-right">Valor a Pagar</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Base / Salário</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Horas Extras</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Vale Transp.</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">Descontos</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-center print:hidden">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32 print:hidden">Aprovação</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((row) => {
                const rowTotal = (Number(row.baseValue) || 0) + (Number(row.extras) || 0) - (Number(row.discounts) || 0);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-100 transition-colors print:border-black ${
                      row.isPaid
                        ? "bg-green-50/60 print:bg-transparent"
                        : "bg-white hover:bg-gray-50/70"
                    }`}
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 text-sm">{row.name}</span>
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
                      <span className="font-bold text-lg text-gray-900">
                        R$ {rowTotal.toFixed(2)}
                      </span>
                    </td>

                    {/* Base */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.baseValue}
                        onChange={e => handleChange(row.id, "baseValue", e.target.value)}
                        disabled={row.isPaid}
                        className={`${inputBase} disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Extras */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.extras}
                        onChange={e => handleChange(row.id, "extras", e.target.value)}
                        disabled={row.isPaid}
                        className={`${inputBase} text-blue-700 focus:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Vale Transporte */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={!row.receivesVT ? 0 : row.vtValue}
                        onChange={e => handleChange(row.id, "vtValue", e.target.value)}
                        disabled={row.isPaid || !row.receivesVT}
                        className={`${inputBase} ${
                          !row.receivesVT 
                            ? 'bg-gray-200 cursor-not-allowed text-transparent border-transparent print:hidden' 
                            : 'text-amber-700 focus:text-amber-800'
                        } disabled:text-gray-400`}
                      />
                    </td>

                    {/* Descontos */}
                    <td className="px-2 py-2">
                      <input
                        type="number" step="0.01"
                        value={row.discounts}
                        onChange={e => handleChange(row.id, "discounts", e.target.value)}
                        disabled={row.isPaid}
                        className={`${inputBase} text-red-600 focus:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
                      />
                    </td>

                    {/* Observações */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.observations}
                        onChange={e => handleChange(row.id, "observations", e.target.value)}
                        disabled={row.isPaid}
                        placeholder="Adicionar nota..."
                        className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 transition-all outline-none text-left text-sm text-gray-600 placeholder-gray-300 disabled:cursor-not-allowed print:border-none print:bg-transparent print:p-0 print:ring-0 print:placeholder-transparent"
                      />
                    </td>

                    {/* Status (toggle) */}
                    <td className="px-4 py-3 text-center print:hidden">
                      <button
                        onClick={() => handleTogglePaid(row.id, row.isPaid)}
                        disabled={pendingPaid}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all duration-200 disabled:opacity-50 ${
                          row.isPaid
                            ? "bg-green-500 text-white border-transparent shadow-sm shadow-green-200 hover:bg-green-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        }`}
                      >
                        {row.isPaid
                          ? <><Check className="h-4 w-4" /> Pago</>
                          : <><span className="h-4 w-4 rounded-full border-2 border-gray-300 inline-block" /> Pagar</>
                        }
                      </button>
                    </td>

                    {/* Aprovação */}
                    <td className="px-4 py-3 print:hidden">
                      {row.isPaid && row.approvedBy ? (
                        <div className="flex items-start gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-green-700">{row.approvedBy}</div>
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
    );
  };

  return (
    <div className="flex flex-col bg-white min-h-full">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body, html, #__next, main, .min-h-screen { min-height: 0 !important; height: auto !important; }
          input { border: none !important; background: transparent !important; padding: 2px 0 !important; box-shadow: none !important; appearance: none; -webkit-appearance: none; }
          input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
          input::placeholder { color: transparent !important; }
        }
      `}} />

      {/* ── Toolbar ── */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
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
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}

          {/* KPIs inline */}
          {rows.length > 0 && (
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {paidCount}/{rows.length} pagos
              </span>
              <span className="text-xs text-gray-500">
                Total: <strong className="text-gray-800">R$ {totalAPagar.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500">
                Pago: <strong className="text-green-700">R$ {totalPago.toFixed(2)}</strong>
              </span>
              <span className="text-xs text-gray-500">
                Pendente: <strong className="text-orange-600">R$ {(totalAPagar - totalPago).toFixed(2)}</strong>
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
          {rows.length > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
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
          </div>
        )}
      </div>
    </div>
  );
}

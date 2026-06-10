"use client";

import { useState, useEffect } from "react";
import { getAbsenceExemptions, addAbsenceExemption, deleteAbsenceExemption } from "@/actions/employee";
import { CalendarRange, Trash, Plus, Loader2, X, AlertCircle } from "lucide-react";

interface Exemption {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface AbsenceExemptionModalProps {
  employeeId: string;
  employeeName: string;
}

export default function AbsenceExemptionModal({ employeeId, employeeName }: AbsenceExemptionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadExemptions();
    }
  }, [isOpen]);

  const loadExemptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAbsenceExemptions(employeeId);
      setExemptions(data);
    } catch {
      setError("Não foi possível carregar os abonos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("A data de início não pode ser maior que a data de término.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addAbsenceExemption(employeeId, startDate, endDate, reason.trim());
      setStartDate("");
      setEndDate("");
      setReason("");
      await loadExemptions();
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao adicionar o abono.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      await deleteAbsenceExemption(id);
      await loadExemptions();
    } catch {
      setError("Não foi possível excluir o abono.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-2 rounded-lg transition-colors"
        title="Abonos e Afastamentos (INSS/Atestados)"
      >
        <CalendarRange className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-55">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-orange-500" />
                  Abonos & Afastamentos
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Gestão de ausências justificadas de <strong>{employeeName}</strong></p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 max-h-[60vh]">
              {/* Form to Add */}
              <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-gray-800">Registrar Novo Afastamento/Abono</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Data de Início</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Data de Término</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Motivo / Descrição</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Ex: Atestado Médico, Afastamento INSS, Licença Maternidade"
                    className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm self-end disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Lançar Período
                </button>
              </form>

              {/* List of Exemptions */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-gray-800">Histórico de Períodos Abonados</h4>
                
                {isLoading ? (
                  <div className="flex justify-center items-center py-8 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : exemptions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 border border-dashed rounded-xl border-gray-200">
                    Nenhum período de abono cadastrado para este colaborador.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {exemptions.map(ex => (
                      <div key={ex.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-gray-800 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full w-fit">
                            {ex.reason}
                          </span>
                          <span className="text-xs text-gray-500 mt-1 font-medium">
                            Período: {formatDate(ex.startDate)} até {formatDate(ex.endDate)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          disabled={deletingId === ex.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="Excluir período de abono"
                        >
                          {deletingId === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Settings, Info, Loader2, Check } from "lucide-react";
import { saveGlobalRates } from "@/actions/config";

export default function GlobalRatesWidget({
  initialExtraHourRate,
  initialWorkedHourRate,
}: {
  initialExtraHourRate: number;
  initialWorkedHourRate: number;
}) {
  const [extraHourRate, setExtraHourRate] = useState(initialExtraHourRate);
  const [workedHourRate, setWorkedHourRate] = useState(initialWorkedHourRate);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await saveGlobalRates(extraHourRate, workedHourRate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
        <Settings className="h-5 w-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Taxas de Hora — Global</h3>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Taxas aplicadas a <strong>todos os funcionários</strong>. Colaboradores com uma taxa individual
            cadastrada (exceção) usam o valor próprio em vez do global.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Hora Extra — CLT (R$/h)
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={extraHourRate}
              onChange={(e) => setExtraHourRate(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-orange-300 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none text-sm font-bold text-right"
            />
            <span className="text-xs text-slate-400">Taxa de hora extra para contratos CLT</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Hora Trabalhada — Não Registrado (R$/h)
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={workedHourRate}
              onChange={(e) => setWorkedHourRate(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 border border-purple-300 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm font-bold text-right"
            />
            <span className="text-xs text-slate-400">Taxa por hora trabalhada para Não Registrados</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 ${
              saved
                ? "bg-green-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-white"
            }`}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
            ) : saved ? (
              <><Check className="h-4 w-4" /> Salvo!</>
            ) : (
              "Salvar Taxas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

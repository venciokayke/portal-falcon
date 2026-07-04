"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

import { logActivity } from "@/actions/activity-log";

export default function PrintClient({ employees }: { employees: any[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"blank" | "filled">("blank");
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const handleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedEmployees = [
    ...(selectedIds.includes("__GENERIC_BLANK__") ? [{
      id: "__GENERIC_BLANK__",
      name: "__________________________________________________",
      workSchedule: "_________________________",
      contractType: "_________________________"
    }] : []),
    ...employees.filter(e => selectedIds.includes(e.id))
  ];

  const handlePrint = (printMode: "blank" | "filled") => {
    setMode(printMode);
    logActivity("IMPRESSAO_FOLHA_PONTO", `Folha em branco (${selectedEmployees.length} selecionados) - ${month + 1}/${year}`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Auxiliar para gerar os dias
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: .5cm;
            size: A4;
          }
          /* Economia de tinta: remove fundos coloridos */
          thead { background-color: transparent !important; }
          th, td { background-color: transparent !important; }
          /* Bordas mais finas e cinza claro */
          table, th, td { border-color: #555 !important; border-width: 0.5pt !important; }
          /* Remove arredondamentos */
          * { border-radius: 0 !important; box-shadow: none !important; }
          /* Compacta o header da folha */
          h2 { font-size: 13pt !important; margin-bottom: 2mm !important; }
          p  { font-size: 9pt  !important; margin: 0 !important; }
          /* Linhas mais finas */
          tr.h-5 { height: 4mm !important; }
        }
      `}} />

      <div className="min-h-screen bg-gray-50">
        {/* Controles - Escondidos na Impressão usando print:hidden */}
        <div className="print:hidden p-6 max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Printer className="text-blue-600" />
              Impressão de Folha de Ponto
            </h1>

            <div className="flex gap-4 mb-6">
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <label className="flex items-center gap-2 font-medium cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === employees.length && employees.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Selecionar Todos
                </label>
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {selectedIds.length} selecionados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                {/* Opção de Folha em Branco (Sem Nome) */}
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50/50 hover:bg-blue-50 p-2 rounded-lg border border-dashed border-blue-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes("__GENERIC_BLANK__")}
                    onChange={() => handleSelect("__GENERIC_BLANK__")}
                    className="w-4.5 h-4.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-blue-700 font-semibold truncate">
                    ✨ FOLHA EM BRANCO (SEM NOME)
                  </span>
                </label>

                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg border border-transparent hover:border-gray-200 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => handleSelect(emp.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 truncate font-medium">{emp.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-8 flex pt-4 border-t border-gray-100">
              <button
                onClick={() => handlePrint("blank")}
                disabled={selectedIds.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Printer className="w-5 h-5" />
                Imprimir Folha(s) de Ponto
              </button>
            </div>
          </div>
        </div>

        {/* Visualização de Impressão - Escondida na tela (hidden), mostrada na impressão (print:block) */}
        <div className="hidden print:block bg-white text-black">
          {selectedEmployees.map((emp, index) => (
            <div
              key={emp.id}
              className={`p-4 w-full max-w-[210mm] mx-auto box-border relative ${index < selectedEmployees.length - 1 ? 'print:break-after-page' : ''}`}
              style={index < selectedEmployees.length - 1 ? { pageBreakAfter: 'always' } : {}}
            >
              {/* Header do Relatório */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">Controle de Frequência</h2>
                <p className="text-md font-semibold mt-2">Mês de Referência: {String(month + 1).padStart(2, '0')}/{year}</p>
              </div>

              {/* Dados do Colaborador */}
              <div className="mb-4 grid grid-cols-2 gap-y-1 gap-x-4 text-sm border border-gray-500 p-2">
                <div className="col-span-2"><strong className="uppercase">Colaborador:</strong> {emp.name}</div>
                <div>
                  <strong className="uppercase">Escala:</strong> {
                    emp.id === "__GENERIC_BLANK__"
                      ? "_________________________"
                      : (emp.workSchedule === 'FIXED_220' ? '220h Mensais' : emp.workSchedule === 'FIXED_180' ? '180h Mensais' : emp.workSchedule === 'SCALE_12X36' ? 'Escala 12x36' : 'Personalizada')
                  }
                </div>
                <div>
                  <strong className="uppercase">Contrato:</strong> {
                    emp.id === "__GENERIC_BLANK__"
                      ? "_________________________"
                      : (emp.contractType === 'PJ_FIXO' ? 'PJ Fixo' : emp.contractType === 'PJ_HORISTA' ? 'PJ Horista' : emp.contractType)
                  }
                </div>
              </div>

              {/* Tabela de Dias */}
              <table className="w-full text-[10px] sm:text-xs text-center border-collapse mb-4 border border-gray-400">
                <thead>
                  <tr>
                    <th className="border border-gray-400 p-1 w-8">Dia</th>
                    <th className="border border-gray-400 p-1 w-24">Local</th>
                    <th className="border border-gray-400 p-1 w-14">Entrada 1</th>
                    <th className="border border-gray-400 p-1 w-14">Saída 1</th>
                    <th className="border border-gray-400 p-1 w-14">Entrada 2</th>
                    <th className="border border-gray-400 p-1 w-14">Saída 2</th>
                    <th className="border border-gray-400 p-1 w-40">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {daysArray.map(day => (
                    <tr key={day} className="h-[4.5mm]">
                      <td className="border border-gray-300 font-semibold text-[9px]">{String(day).padStart(2, '0')}</td>
                      <td className="border border-gray-300"></td>
                      <td className="border border-gray-300"></td>
                      <td className="border border-gray-300"></td>
                      <td className="border border-gray-300"></td>
                      <td className="border border-gray-300"></td>
                      <td className="border border-gray-300"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

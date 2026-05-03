"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

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

  const selectedEmployees = employees.filter(e => selectedIds.includes(e.id));

  const handlePrint = (printMode: "blank" | "filled") => {
    setMode(printMode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Auxiliar para gerar os dias
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
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

            <div className="mt-8 flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <button 
                onClick={() => handlePrint("blank")}
                disabled={selectedIds.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Printer className="w-5 h-5" />
                Imprimir em Branco
              </button>
              <button 
                onClick={() => handlePrint("filled")}
                disabled={selectedIds.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                <Printer className="w-5 h-5" />
                Imprimir Preenchidos
              </button>
            </div>
          </div>
        </div>

        {/* Visualização de Impressão - Escondida na tela (hidden), mostrada na impressão (print:block) */}
        <div className="hidden print:block bg-white text-black">
          {selectedEmployees.map((emp, index) => (
            <div 
              key={emp.id} 
              className="print:break-after-page p-4 w-full max-w-[210mm] mx-auto box-border relative"
              style={{ pageBreakAfter: 'always' }}
            >
              {/* Header do Relatório */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">Controle de Frequência</h2>
                <p className="text-md font-semibold mt-2">Mês de Referência: {String(month + 1).padStart(2, '0')}/{year}</p>
              </div>
              
              {/* Dados do Colaborador */}
              <div className="mb-6 grid grid-cols-2 gap-y-2 gap-x-4 text-sm border-2 border-gray-800 p-3 rounded">
                <div><strong className="uppercase">Colaborador:</strong> {emp.name}</div>
                <div><strong className="uppercase">Escala:</strong> {emp.workSchedule}</div>
                <div><strong className="uppercase">Contrato:</strong> {emp.contractType}</div>
                <div><strong className="uppercase">Chave PIX:</strong> {emp.pixKey || "Não cadastrada"}</div>
              </div>

              {/* Tabela de Dias */}
              <table className="w-full text-[10px] sm:text-xs text-center border-collapse mb-4 border-2 border-gray-800">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-800 p-1 w-8">Dia</th>
                    <th className="border border-gray-800 p-1 w-24">Local</th>
                    <th className="border border-gray-800 p-1 w-14">Entrada 1</th>
                    <th className="border border-gray-800 p-1 w-14">Saída 1</th>
                    <th className="border border-gray-800 p-1 w-14">Entrada 2</th>
                    <th className="border border-gray-800 p-1 w-14">Saída 2</th>
                    <th className="border border-gray-800 p-1 w-40">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {daysArray.map(day => (
                    <tr key={day} className="h-5">
                      <td className="border border-gray-800 font-bold">{String(day).padStart(2, '0')}</td>
                      <td className="border border-gray-800"></td>
                      <td className="border border-gray-800 text-gray-400 font-mono tracking-tighter">{mode === "filled" ? "__:__" : ""}</td>
                      <td className="border border-gray-800 text-gray-400 font-mono tracking-tighter">{mode === "filled" ? "__:__" : ""}</td>
                      <td className="border border-gray-800 text-gray-400 font-mono tracking-tighter">{mode === "filled" ? "__:__" : ""}</td>
                      <td className="border border-gray-800 text-gray-400 font-mono tracking-tighter">{mode === "filled" ? "__:__" : ""}</td>
                      <td className="border border-gray-800"></td>
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

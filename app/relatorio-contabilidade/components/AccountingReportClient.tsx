"use client";

import { Printer, Calendar } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { logActivity } from "@/actions/activity-log";
interface EmployeeData {
  id: string;
  name: string;
  receivesNightHazard: boolean;
  workLocation: string;
  standardHours: string;
  intervalarValue: string;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AccountingReportClient({ data, initialMonth, initialYear }: { data: EmployeeData[], initialMonth: number, initialYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const handleDateChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    router.push(`/relatorio-contabilidade?month=${newMonth + 1}&year=${newYear}`);
  };
  const handlePrint = () => {
    logActivity("IMPRESSAO_RELATORIO_CONTABILIDADE", `Mês/Ano: ${month + 1}/${year}`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          input[type="date"]::-webkit-calendar-picker-indicator {
            display: none !important;
            -webkit-appearance: none !important;
          }
          /* Ajustes de layout para caber na folha */
          table, th, td {
            font-size: 10px !important;
          }
          th, td {
            padding: 4px !important;
          }
          input[type="date"] {
            width: 70px !important;
            font-size: 10px !important;
          }
          th.w-\\[200px\\] {
            width: 155px !important;
          }
        }
      `}} />

      <div className="p-4 border-b border-gray-200 flex justify-between items-center print:hidden bg-gray-50">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-400 h-5 w-5" />
          <select
            value={month}
            onChange={e => handleDateChange(Number(e.target.value), year)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => handleDateChange(month, Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4" />
          Imprimir Relatório
        </button>
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
            {data.map((emp) => (
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
                    className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0"
                  >
                    <option value=""></option>
                    <option value="SIM">SIM</option>
                    <option value="NÃO">NÃO</option>
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
                      defaultValue={emp.intervalarValue}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                  )}
                </td>
                <td className="px-2 py-1 border-r border-gray-200 align-middle">
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input
                      type="date"
                      className="w-[95px] text-xs bg-transparent border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                    <span className="text-gray-500 font-medium text-xs print:text-black">a</span>
                    <input
                      type="date"
                      className="w-[95px] text-xs bg-transparent border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                  </div>
                </td>
                <td className="px-2 py-1 align-middle">
                  <div className="flex items-center justify-center gap-1 w-full">
                    <input
                      type="date"
                      className="w-[95px] text-xs bg-transparent border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                    <span className="text-gray-500 font-medium text-xs print:text-black">a</span>
                    <input
                      type="date"
                      className="w-[95px] text-xs bg-transparent border border-gray-300 rounded px-1 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:appearance-none print:border-none print:p-0 print:focus:ring-0 text-center"
                    />
                  </div>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
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

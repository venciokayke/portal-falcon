"use client";

import { Printer } from "lucide-react";

interface EmployeeData {
  id: string;
  name: string;
  receivesNightHazard: boolean;
  workLocation: string;
  standardHours: string;
  intervalarValue: string;
}

export default function AccountingReportClient({ data }: { data: EmployeeData[] }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      <div className="p-4 border-b border-gray-200 flex justify-end print:hidden bg-gray-50">
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
            <tr>
              <th className="px-4 py-3 border-r border-gray-300">FUNCIONÁRIO</th>
              <th className="px-3 py-3 border-r border-gray-300 w-16 text-center">AD</th>
              <th className="px-3 py-3 border-r border-gray-300 w-24">ATESTADO</th>
              <th className="px-4 py-3 border-r border-gray-300">LOTAÇÃO</th>
              <th className="px-4 py-3 border-r border-gray-300">HORÁRIO DE TRABALHO</th>
              <th className="px-3 py-3 border-r border-gray-300 w-32">HORA INTERVALAR</th>
              <th className="px-3 py-3 border-r border-gray-300 w-24">FALTAS</th>
              <th className="px-4 py-3 w-40">DESCONTOS</th>
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
                <td className="px-2 py-1 border-r border-gray-200">
                  <input
                    type="text"
                    className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 print:focus:ring-0"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 print:focus:ring-0"
                  />
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

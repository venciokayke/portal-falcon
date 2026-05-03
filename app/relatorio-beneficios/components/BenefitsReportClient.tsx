"use client";

import { useState, useMemo } from "react";
import { Printer, Plus } from "lucide-react";

interface EmployeeBenefit {
  id: string;
  name: string;
  receivesVA: boolean;
  receivesVT: boolean;
  vaUnid: string;
  vaValue: string;
  vtUnid: string;
  vtValue: string;
}

export default function BenefitsReportClient({ 
  initialData,
  availableExceptions 
}: { 
  initialData: EmployeeBenefit[],
  availableExceptions: { id: string, name: string, receivesVA: boolean, receivesVT: boolean }[]
}) {
  const [data, setData] = useState<EmployeeBenefit[]>(initialData);
  const [exceptions, setExceptions] = useState(availableExceptions);
  const [selectedException, setSelectedException] = useState("");

  const handleUpdate = (id: string, field: keyof EmployeeBenefit, value: string) => {
    setData((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;

        const updated = { ...emp, [field]: value };

        // Recalculate if UNID changed
        if (field === "vaUnid") {
          const num = parseFloat(value) || 0;
          updated.vaValue = (num * 26.0).toFixed(2);
        }
        if (field === "vtUnid") {
          const num = parseFloat(value) || 0;
          updated.vtValue = (num * 8.6).toFixed(2);
        }

        return updated;
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddException = () => {
    if (!selectedException) return;
    
    const emp = exceptions.find(e => e.id === selectedException);
    if (!emp) return;

    setExceptions(prev => prev.filter(e => e.id !== emp.id));
    
    setData(prev => [
      ...prev,
      {
        id: emp.id,
        name: emp.name,
        receivesVA: emp.receivesVA,
        receivesVT: emp.receivesVT,
        vaUnid: "",
        vaValue: "0.00",
        vtUnid: "",
        vtValue: "0.00",
      }
    ]);
    setSelectedException("");
  };

  // Calculations for the header
  const totals = useMemo(() => {
    return data.reduce(
      (acc, emp) => {
        acc.vaUnid += parseFloat(emp.vaUnid) || 0;
        acc.vaValue += parseFloat(emp.vaValue) || 0;
        acc.vtUnid += parseFloat(emp.vtUnid) || 0;
        acc.vtValue += parseFloat(emp.vtValue) || 0;
        return acc;
      },
      { vaUnid: 0, vaValue: 0, vtUnid: 0, vtValue: 0 }
    );
  }, [data]);

  const generalTotal = totals.vaValue + totals.vtValue;

  return (
    <div className="space-y-6">
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

      {/* Header Consolidado */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 print:border-none print:shadow-none print:p-0">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 print:text-black">Consolidado Geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600">Total VA UNID</p>
            <p className="text-xl font-bold text-gray-900">{totals.vaUnid}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600">Total VALOR V.A.</p>
            <p className="text-xl font-bold text-gray-900">R$ {totals.vaValue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600">Total VT UNID</p>
            <p className="text-xl font-bold text-gray-900">{totals.vtUnid}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg print:bg-transparent print:border print:border-gray-300">
            <p className="text-sm text-gray-500 font-medium print:text-gray-600">Total VALOR V.T.</p>
            <p className="text-xl font-bold text-gray-900">R$ {totals.vtValue.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 print:bg-transparent print:border-gray-400">
            <p className="text-sm text-blue-600 font-bold print:text-gray-800">Soma Geral</p>
            <p className="text-2xl font-black text-blue-700 print:text-black">R$ {generalTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Benefícios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent">
        <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4 print:hidden bg-gray-50">
          <div className="flex items-center gap-3">
            <select 
              value={selectedException}
              onChange={(e) => setSelectedException(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
            >
              <option value="">Selecione um funcionário...</option>
              {exceptions.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <button
              onClick={handleAddException}
              disabled={!selectedException}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Adicionar Exceção
            </button>
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
              <tr>
                <th className="px-4 py-3 border-r border-gray-300 w-12 text-center">Nº</th>
                <th className="px-4 py-3 border-r border-gray-300">FUNCIONÁRIO</th>
                <th className="px-4 py-3 border-r border-gray-300 w-32">VA UNID.</th>
                <th className="px-4 py-3 border-r border-gray-300 w-40">VALOR V.A. (R$)</th>
                <th className="px-4 py-3 border-r border-gray-300 w-32">VT UNID.</th>
                <th className="px-4 py-3 w-40">VALOR V.T. (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 border-b border-gray-300">
              {data.map((emp, index) => (
                <tr key={emp.id} className="hover:bg-gray-50 print:hover:bg-transparent">
                  <td className="px-4 py-2 border-r border-gray-200 text-center text-gray-500 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 font-medium text-gray-900 truncate max-w-[250px]" title={emp.name}>
                    {emp.name}
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200">
                    <input 
                      type="number" 
                      value={emp.vaUnid}
                      onChange={(e) => handleUpdate(emp.id, "vaUnid", e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 print:focus:ring-0 text-center" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200">
                    <input 
                      type="number" 
                      step="0.01"
                      value={emp.vaValue}
                      onChange={(e) => handleUpdate(emp.id, "vaValue", e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 print:focus:ring-0 text-right" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-gray-200">
                    <input 
                      type="number" 
                      value={emp.vtUnid}
                      onChange={(e) => handleUpdate(emp.id, "vtUnid", e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none print:border-none print:p-0 print:focus:ring-0 text-center" 
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input 
                      type="number" 
                      step="0.01"
                      value={emp.vtValue}
                      onChange={(e) => handleUpdate(emp.id, "vtValue", e.target.value)}
                      className="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none font-medium print:border-none print:p-0 print:focus:ring-0 text-right" 
                    />
                  </td>
                </tr>
              ))}
              
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum funcionário CLT encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

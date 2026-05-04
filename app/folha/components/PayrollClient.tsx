"use client";

import { useState, useEffect } from "react";
import { getPayrollData, savePayrollReceipts } from "@/actions/payroll";
import { Calendar, Save, Loader2, Printer } from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function PayrollClient() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getPayrollData(month, year);
      setRows(data);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dados da folha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (employeeId: string, field: string, value: string) => {
    setRows(currentRows => currentRows.map(row => {
      if (row.employeeId !== employeeId) return row;
      return { ...row, [field]: value };
    }));
  };

  const calculateTotal = (row: any) => {
    const cc = Number(row.contraCheque) || 0;
    const vt = Number(row.valeTransporte) || 0;
    const extras = Number(row.valoresExtras) || 0;
    const desc = Number(row.descontos) || 0;
    return cc + vt + extras - desc;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const receiptsToSave = rows.map(r => ({
        ...r,
        contraCheque: Number(r.contraCheque) || 0,
        valeTransporte: Number(r.valeTransporte) || 0,
        valoresExtras: Number(r.valoresExtras) || 0,
        descontos: Number(r.descontos) || 0,
        observacoes: r.observacoes || "",
        total: calculateTotal(r)
      }));

      await savePayrollReceipts(month, year, receiptsToSave);
      alert("Fechamento salvo com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar o fechamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const grupoService = rows.filter(r => r.registrationCompany === 'FALCON_SERVICE');
  const grupoMonitoramento = rows.filter(r => r.registrationCompany === 'FALCON_MONITORAMENTO');
  const grupoNaoRegistrados = rows.filter(r => r.registrationCompany === 'NAO_REGISTRADO');

  const renderTable = (title: string, groupRows: any[]) => {
    if (groupRows.length === 0) return null;

    const totalAPagar = groupRows.reduce((acc, row) => acc + calculateTotal(row), 0);
    const totalCC = groupRows.reduce((acc, row) => acc + (Number(row.contraCheque) || 0), 0);
    const totalVT = groupRows.reduce((acc, row) => acc + (Number(row.valeTransporte) || 0), 0);
    const totalExtras = groupRows.reduce((acc, row) => acc + (Number(row.valoresExtras) || 0), 0);
    const totalDesc = groupRows.reduce((acc, row) => acc + (Number(row.descontos) || 0), 0);

    return (
      <div className="mb-8 print:mb-4 print:break-inside-avoid">
        <div className="overflow-x-auto border border-black print:border-black rounded-lg print:rounded-none">
          <table className="w-full text-sm text-left border-collapse print:text-[10px]">
            <thead>
              {/* Título Amarelo */}
              <tr>
                <th colSpan={9} className="bg-yellow-400 text-black text-center font-bold py-2 border-b border-black uppercase print:border-black text-base print:text-xs">
                  FUNCIONÁRIOS {title}
                </th>
              </tr>

              {/* Linha de Totais (Sub-header) */}
              <tr className="bg-gray-200 border-b border-black print:bg-gray-100 print:border-black">
                <th colSpan={3} className="px-2 py-1.5 font-bold text-right border-r border-black print:border-black">
                  VALORES TOTAIS:
                </th>
                <th className="px-2 py-1.5 font-bold text-right text-green-700 print:text-black border-r border-black print:border-black whitespace-nowrap">
                  R$ {totalAPagar.toFixed(2)}
                </th>
                <th className="px-2 py-1.5 font-bold text-right border-r border-black print:border-black">
                  {totalCC.toFixed(2)}
                </th>
                <th className="px-2 py-1.5 font-bold text-right border-r border-black print:border-black">
                  {totalVT.toFixed(2)}
                </th>
                <th className="px-2 py-1.5 font-bold text-right border-r border-black print:border-black text-blue-700 print:text-black">
                  {totalExtras.toFixed(2)}
                </th>
                <th className="px-2 py-1.5 font-bold text-right border-r border-black print:border-black text-red-700 print:text-black">
                  {totalDesc.toFixed(2)}
                </th>
                <th className="px-2 py-1.5 border-black print:border-black"></th>
              </tr>

              {/* Cabeçalho de Colunas */}
              <tr className="bg-white border-b border-black print:bg-white print:border-black text-xs uppercase tracking-tight">
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black min-w-[150px]">Funcionário</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-20">Tipo</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-32">PIX</th>
                <th className="px-2 py-1.5 font-bold border-r border-black print:border-black w-24 bg-green-50 print:bg-transparent">Valor a Pagar</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-20">Contra Cheque</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-20">Vale Transporte</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-20">Valores Extras</th>
                <th className="px-2 py-1.5 font-semibold border-r border-black print:border-black w-20">Descontos</th>
                <th className="px-2 py-1.5 font-semibold print:border-black w-40">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 print:divide-black">
              {groupRows.map((row) => {
                const total = calculateTotal(row);

                return (
                  <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors print:hover:bg-transparent bg-white">
                    <td className="px-2 py-1 border-r border-black print:border-black font-medium text-gray-900 truncate max-w-[180px]">
                      {row.name}
                    </td>
                    <td className="px-2 py-1 border-r border-black print:border-black text-xs truncate max-w-[80px]">
                      {row.pixType || "-"}
                    </td>
                    <td className="px-2 py-1 border-r border-black print:border-black text-xs truncate max-w-[150px]">
                      {row.pixKey || "-"}
                    </td>
                    <td className="px-2 py-1 border-r border-black print:border-black font-bold text-green-700 bg-green-50 print:bg-transparent print:text-black text-right whitespace-nowrap">
                      R$ {total.toFixed(2)}
                    </td>
                    <td className="p-0 border-r border-black print:border-black">
                      <input
                        type="number"
                        step="0.01"
                        value={row.contraCheque}
                        onChange={(e) => handleChange(row.employeeId, 'contraCheque', e.target.value)}
                        className="w-full h-full px-2 py-1.5 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-right print:p-1"
                      />
                    </td>
                    <td className="p-0 border-r border-black print:border-black">
                      <input
                        type="number"
                        step="0.01"
                        value={row.valeTransporte}
                        onChange={(e) => handleChange(row.employeeId, 'valeTransporte', e.target.value)}
                        disabled={!row.receivesVT}
                        className="w-full h-full px-2 py-1.5 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-right disabled:bg-gray-100 disabled:text-gray-400 print:p-1 print:disabled:bg-transparent print:disabled:text-black"
                      />
                    </td>
                    <td className="p-0 border-r border-black print:border-black">
                      <input
                        type="number"
                        step="0.01"
                        value={row.valoresExtras}
                        onChange={(e) => handleChange(row.employeeId, 'valoresExtras', e.target.value)}
                        className="w-full h-full px-2 py-1.5 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-right text-blue-600 font-medium print:text-black print:p-1"
                      />
                    </td>
                    <td className="p-0 border-r border-black print:border-black">
                      <input
                        type="number"
                        step="0.01"
                        value={row.descontos}
                        onChange={(e) => handleChange(row.employeeId, 'descontos', e.target.value)}
                        className="w-full h-full px-2 py-1.5 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-right text-red-600 font-medium print:text-black print:p-1"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.observacoes}
                        onChange={(e) => handleChange(row.employeeId, 'observacoes', e.target.value)}
                        placeholder="Observação"
                        className="w-full h-full px-2 py-1.5 bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-left print:p-1"
                      />
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
    <div className="flex flex-col bg-white">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 landscape; margin: 5mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Remover altura mínima que gera folha em branco */
          body, html, #__next, main, .min-h-screen { min-height: 0 !important; height: auto !important; }
          /* Esconder botões na impressão */
          .no-print { display: none !important; }
          /* Inputs parecerão texto puro */
          input { 
            border: none !important; 
            background: transparent !important; 
            padding: 2px !important;
            box-shadow: none !important; 
            appearance: none;
            -webkit-appearance: none;
          }
          /* Ocultar as setinhas chatas de inputs numéricos */
          input[type=number]::-webkit-inner-spin-button, 
          input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
          }
        }
      `}} />

      <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-500 h-5 w-5" />
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700 transition-shadow"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700 transition-shadow"
          >
            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir Planilha
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar Fechamento"}
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading && rows.length === 0 ? (
          <div className="flex justify-center items-center py-20 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-gray-500 italic border-2 border-dashed border-gray-200 rounded-xl">
            Nenhum colaborador ativo encontrado para este período.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="hidden print:block text-center mb-6">
              <h1 className="text-2xl font-bold uppercase">Planilha de Fechamento Consolidada</h1>
              <h2 className="text-lg font-semibold text-gray-600">Competência: {String(month + 1).padStart(2, '0')}/{year}</h2>
            </div>
            {renderTable("FALCON SERVICE", grupoService)}
            {renderTable("FALCON MONITORAMENTO", grupoMonitoramento)}
            {renderTable("NÃO REGISTRADOS", grupoNaoRegistrados)}
          </div>
        )}
      </div>
    </div>
  );
}

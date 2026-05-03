"use client";

import { useState, useEffect } from "react";
import { getPayrollData, savePayrollReceipts } from "@/actions/payroll";
import { Calendar, Save, ClipboardCopy, Loader2, Printer } from "lucide-react";

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

      const newRow = { ...row, [field]: value };

      // Se o usuário digitou algo numérico para faltas, rodamos a reatividade
      if (field === 'absences') {
        const numAbsences = Number(value) || 0;

        if (row.receivesVA) {
          // suggestedVA = (Projeção * 26.00) - (Faltas * 26.00)
          newRow.vaTotal = Math.max(0, (row.expectedDaysNextMonth * 26.00) - (numAbsences * 26.00)).toFixed(2);
        }
        if (row.receivesVT) {
          // suggestedVT = (Projeção * 8.60) - (Faltas * 8.60)
          newRow.vtTotal = Math.max(0, (row.expectedDaysNextMonth * 8.60) - (numAbsences * 8.60)).toFixed(2);
        }
      }

      return newRow;
    }));
  };

  const calculateTotal = (row: any) => {
    const net = Number(row.netSalaryAccounting) || 0;
    const va = Number(row.vaTotal) || 0;
    const vt = Number(row.vtTotal) || 0;
    const extra = Number(row.extraHoursTotalValue) || 0;
    const adds = Number(row.manualAdditions) || 0;
    const deds = Number(row.manualDeductions) || 0;

    return net + va + vt + extra + adds - deds;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const receiptsToSave = rows.map(r => ({
        ...r,
        netSalaryAccounting: Number(r.netSalaryAccounting) || 0,
        extraHoursTotalValue: Number(r.extraHoursTotalValue) || 0,
        vaTotal: Number(r.vaTotal) || 0,
        vtTotal: Number(r.vtTotal) || 0,
        manualAdditions: Number(r.manualAdditions) || 0,
        manualDeductions: Number(r.manualDeductions) || 0,
        finalAmount: calculateTotal(r)
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

  const exportPix = () => {
    if (rows.length === 0) return alert("Nenhum dado para exportar.");

    const lines = rows.map(r => {
      const total = calculateTotal(r).toFixed(2);
      const pix = r.pixKey ? `PIX: ${r.pixType} - ${r.pixKey}` : "SEM PIX CADASTRADO";
      return `${r.name} | ${pix} | R$ ${total}`;
    });

    const text = `FECHAMENTO - ${MONTHS[month]} ${year}\n\n` + lines.join("\n");

    navigator.clipboard.writeText(text).then(() => {
      alert("Lista copiada para a área de transferência!");
    }).catch(err => {
      console.error("Falha ao copiar", err);
      alert("Não foi possível copiar para a área de transferência.");
    });
  };

  return (
    <div className="flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
            onClick={exportPix}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <ClipboardCopy className="h-4 w-4" />
            Exportar PIX
          </button>
          <button
            onClick={() => { setTimeout(() => window.print(), 100); }}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir Holerites
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Salvando..." : "Salvar Folha"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="px-4 py-3 font-semibold min-w-[150px]">Funcionário</th>
              <th className="px-2 py-3 font-semibold w-20">Faltas</th>
              <th className="px-2 py-3 font-semibold w-28">C. Cheque (R$)</th>
              <th className="px-2 py-3 font-semibold w-24">VA (R$)</th>
              <th className="px-2 py-3 font-semibold w-24">VT (R$)</th>
              <th className="px-2 py-3 font-semibold w-24">Extras (R$)</th>
              <th className="px-2 py-3 font-semibold w-24">Diversos (R$)</th>
              <th className="px-2 py-3 font-semibold w-24">Descontos (R$)</th>
              <th className="px-4 py-3 font-bold text-gray-900 w-32 bg-green-50">TOTAL PIX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row) => {
              const total = calculateTotal(row);

              return (
                <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{row.name}</span>
                    <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]">
                      {row.pixKey ? `PIX: ${row.pixType}` : "Sem PIX"}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      value={row.absences}
                      onChange={(e) => handleChange(row.employeeId, 'absences', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.netSalaryAccounting}
                      onChange={(e) => handleChange(row.employeeId, 'netSalaryAccounting', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.vaTotal}
                      onChange={(e) => handleChange(row.employeeId, 'vaTotal', e.target.value)}
                      disabled={!row.receivesVA}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.vtTotal}
                      onChange={(e) => handleChange(row.employeeId, 'vtTotal', e.target.value)}
                      disabled={!row.receivesVT}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.extraHoursTotalValue}
                      onChange={(e) => handleChange(row.employeeId, 'extraHoursTotalValue', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right text-blue-600 font-medium"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.manualAdditions}
                      onChange={(e) => handleChange(row.employeeId, 'manualAdditions', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right text-green-600 font-medium"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.manualDeductions}
                      onChange={(e) => handleChange(row.employeeId, 'manualDeductions', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right text-red-600 font-medium"
                    />
                  </td>
                  <td className="px-4 py-3 bg-green-50 font-bold text-green-700 text-right whitespace-nowrap">
                    R$ {total.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && !isLoading && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500 italic">
                  Nenhum colaborador ativo encontrado para este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print View: Holerites Individuais */}
      <div className="hidden print:block bg-white text-black">
        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
            @page { margin: 1cm; size: A4; }
          }
        `}} />
        {rows.map((row) => {
          const total = calculateTotal(row);
          return (
            <div key={row.employeeId} className="print:break-after-page p-6 w-full max-w-[210mm] mx-auto box-border" style={{ pageBreakAfter: 'always' }}>
              <div className="border-2 border-gray-900 rounded-lg p-6 h-auto">
                <div className="text-center border-b-2 border-gray-900 pb-4 mb-4">
                  <h2 className="text-xl font-bold uppercase tracking-widest">Recibo de Pagamento de Salário</h2>
                  <p className="text-md font-semibold mt-1">Competência: {String(month + 1).padStart(2, '0')}/{year}</p>
                </div>

                <div className="flex justify-between mb-6 text-sm border-b border-gray-300 pb-4">
                  <div>
                    <p><strong className="uppercase">Colaborador:</strong> {row.name}</p>
                    <p><strong>Faltas Registradas no Mês:</strong> {row.absences}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Chave PIX p/ Pagamento:</strong> {row.pixKey ? row.pixKey : "Não cadastrada"}</p>
                  </div>
                </div>

                <table className="w-full text-sm text-left mb-8 border-collapse border border-gray-900">
                  <thead className="bg-gray-100 border-b border-gray-900">
                    <tr>
                      <th className="p-2 border-r border-gray-900">Descrição</th>
                      <th className="p-2 border-r border-gray-900 w-32 text-right">Vencimentos (R$)</th>
                      <th className="p-2 w-32 text-right">Descontos (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-300">
                      <td className="p-2 border-r border-gray-900">Contra Cheque Base</td>
                      <td className="p-2 border-r border-gray-900 text-right">{Number(row.netSalaryAccounting).toFixed(2)}</td>
                      <td className="p-2 text-right"></td>
                    </tr>
                    {Number(row.vaTotal) > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-900">Vale Alimentação (VA)</td>
                        <td className="p-2 border-r border-gray-900 text-right">{Number(row.vaTotal).toFixed(2)}</td>
                        <td className="p-2 text-right"></td>
                      </tr>
                    )}
                    {Number(row.vtTotal) > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-900">Vale Transporte (VT)</td>
                        <td className="p-2 border-r border-gray-900 text-right">{Number(row.vtTotal).toFixed(2)}</td>
                        <td className="p-2 text-right"></td>
                      </tr>
                    )}
                    {Number(row.extraHoursTotalValue) > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-900">Horas Extras</td>
                        <td className="p-2 border-r border-gray-900 text-right">{Number(row.extraHoursTotalValue).toFixed(2)}</td>
                        <td className="p-2 text-right"></td>
                      </tr>
                    )}
                    {Number(row.manualAdditions) > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-900">Diversos (Acréscimos Manuais)</td>
                        <td className="p-2 border-r border-gray-900 text-right">{Number(row.manualAdditions).toFixed(2)}</td>
                        <td className="p-2 text-right"></td>
                      </tr>
                    )}
                    {Number(row.manualDeductions) > 0 && (
                      <tr className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-900 text-red-600 font-medium">Descontos Diversos</td>
                        <td className="p-2 border-r border-gray-900 text-right"></td>
                        <td className="p-2 text-right text-red-600 font-medium">{Number(row.manualDeductions).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-900">
                      <td className="p-2 border-r border-gray-900 text-right uppercase">Líquido a Receber</td>
                      <td colSpan={2} className="p-2 text-right text-lg">R$ {total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-12 px-2">
                  <p className="font-bold uppercase text-gray-800 mb-2">Observações (Controle Interno):</p>
                  <div className="w-full h-32 border-2 border-dashed border-gray-400 rounded-lg"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

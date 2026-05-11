"use client";

import { useState } from "react";
import { Printer, Plus, Trash2, ReceiptText, CheckSquare, XSquare } from "lucide-react";

type EmployeeMin = {
  id: string;
  name: string;
  document: string | null;
};

type ReceiptItem = {
  id: string;
  employeeName: string;
  document: string;
  value: number;
  description: string;
  payingCompany: string;
  date: string;
};

export default function ReceiptGeneratorClient({ employees }: { employees: EmployeeMin[] }) {
  const [receiptQueue, setReceiptQueue] = useState<ReceiptItem[]>([]);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDocument, setManualDocument] = useState("");
  const [receiptValue, setReceiptValue] = useState("");
  const [receiptDescription, setReceiptDescription] = useState("Adiantamento Salarial");
  const [payingCompany, setPayingCompany] = useState("FALCON SERVIÇOS LTDA");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  const [manualPayerName, setManualPayerName] = useState("");
  const [manualPayerDocument, setManualPayerDocument] = useState("");

  const isManual = selectedEmployeeId === "__MANUAL__";
  const isManualPayer = payingCompany === "SÓCIO / PESSOA FÍSICA";

  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId || !receiptValue || !receiptDescription || !payingCompany) {
      alert("Preencha todos os campos do recibo.");
      return;
    }

    if (isManual && !manualName.trim()) {
      alert("Informe o nome do recebedor.");
      return;
    }

    if (isManualPayer && !manualPayerName.trim()) {
      alert("Informe o nome do pagador (Sócio/Pessoa Física).");
      return;
    }

    let employeeName: string;
    let document: string;

    if (isManual) {
      employeeName = manualName.trim();
      document = manualDocument.trim();
    } else {
      const employee = employees.find(emp => emp.id === selectedEmployeeId);
      if (!employee) return;
      employeeName = employee.name;
      document = employee.document || "";
    }

    const newItem: ReceiptItem = {
      id: crypto.randomUUID(),
      employeeName,
      document,
      value: Number(receiptValue),
      description: receiptDescription,
      payingCompany: isManualPayer && manualPayerName.trim()
        ? `${manualPayerName.trim()}${manualPayerDocument.trim() ? ` (${manualPayerDocument.trim()})` : ""}`
        : payingCompany,
      date: receiptDate
    };

    setReceiptQueue([...receiptQueue, newItem]);

    // Reset partial form
    setSelectedEmployeeId("");
    setManualName("");
    setManualDocument("");
    setManualPayerName("");
    setManualPayerDocument("");
    setReceiptValue("");
  };

  const handleRemoveReceipt = (id: string) => {
    setReceiptQueue(receiptQueue.filter(item => item.id !== id));

    // Remove from selection if selected
    if (selectedReceipts.has(id)) {
      const newSelected = new Set(selectedReceipts);
      newSelected.delete(id);
      setSelectedReceipts(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedReceipts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReceipts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReceipts.size === receiptQueue.length) {
      setSelectedReceipts(new Set()); // Deselect all
    } else {
      setSelectedReceipts(new Set(receiptQueue.map(item => item.id))); // Select all
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedReceipts.size} recibo(s)?`)) {
      setReceiptQueue(receiptQueue.filter(item => !selectedReceipts.has(item.id)));
      setSelectedReceipts(new Set());
    }
  };

  const handleClearAll = () => {
    if (confirm("Tem certeza que deseja excluir TODOS os recibos da fila?")) {
      setReceiptQueue([]);
      setSelectedReceipts(new Set());
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return "_____ de _________________ de 20____";
    const date = new Date(dateStr + 'T00:00:00'); // Evita bug de fuso horário
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Divide a fila em chunks (páginas) de 2 recibos
  const chunks: ReceiptItem[][] = [];
  for (let i = 0; i < receiptQueue.length; i += 2) {
    chunks.push(receiptQueue.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Formulário Interativo (Oculto na Impressão) */}
      <div className="no-print bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-gray-500" />
            Adicionar Recibo à Fila
          </h3>
        </div>

        <form onSubmit={handleAddReceipt} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário / Recebedor</label>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Selecione o colaborador...</option>
                <option value="__MANUAL__">--- INSERIR MANUALMENTE ---</option>
                <optgroup label="Colaboradores Cadastrados">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </optgroup>
              </select>

              {/* Campos extras para inserção manual */}
              {isManual && (
                <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1">Nome do Recebedor *</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="Ex: Maria Oliveira"
                      required
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      value={manualDocument}
                      onChange={e => setManualDocument(e.target.value)}
                      placeholder="Ex: 000.000.000-00"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 outline-none text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={receiptValue}
                onChange={e => setReceiptValue(e.target.value)}
                placeholder="Ex: 500.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Recibo</label>
              <input
                type="date"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Pagadora</label>
              <select
                value={payingCompany}
                onChange={e => setPayingCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="FALCON SERVIÇOS LTDA">FALCON SERVIÇOS LTDA</option>
                <option value="FALCON MONITORAMENTO LTDA">FALCON MONITORAMENTO LTDA</option>
                <option value="SÓCIO / PESSOA FÍSICA">SÓCIO / PESSOA FÍSICA</option>
              </select>

              {/* Campos extras para pagador manual */}
              {isManualPayer && (
                <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Nome do Pagador *</label>
                    <input
                      type="text"
                      value={manualPayerName}
                      onChange={e => setManualPayerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      value={manualPayerDocument}
                      onChange={e => setManualPayerDocument(e.target.value)}
                      placeholder="Ex: 000.000.000-00"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Referente a (Motivo)</label>
              <input
                type="text"
                value={receiptDescription}
                onChange={e => setReceiptDescription(e.target.value)}
                placeholder="Ex: Adiantamento Salarial"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Adicionar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Lista da Fila (Oculto na Impressão) */}
      {receiptQueue.length > 0 && (
        <div className="no-print bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-gray-800">
                Fila de Impressão ({receiptQueue.length})
              </h3>

              {/* Controles de Ação em Lote */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-md"
                >
                  <CheckSquare className="h-4 w-4" />
                  {selectedReceipts.size === receiptQueue.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>

                {selectedReceipts.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 px-3 py-1.5 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir ({selectedReceipts.size})
                  </button>
                )}

                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors bg-slate-100 px-3 py-1.5 rounded-md border border-slate-300 ml-2"
                >
                  <XSquare className="h-4 w-4" />
                  Limpar Fila
                </button>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-md"
            >
              <Printer className="h-5 w-5" />
              Imprimir Recibos
            </button>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-gray-100">
              {receiptQueue.map((item, index) => (
                <li key={item.id} className={`flex justify-between items-center p-4 hover:bg-gray-50 transition-colors ${selectedReceipts.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedReceipts.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{index + 1}. {item.employeeName}</span>
                      <span className="text-sm text-gray-500">{item.payingCompany} • {formatDateFull(item.date)} • {item.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md">
                      {formatCurrency(item.value)}
                    </span>
                    <button
                      onClick={() => handleRemoveReceipt(item.id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir este recibo"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Renderização para Impressão (Agrupando de 2 em 2) */}
      <div className="hidden print:block bg-white text-black w-full">
        {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className={`print:h-[297mm] print:w-[210mm] flex flex-col box-border ${pageIndex < chunks.length - 1 ? 'print:break-after-page' : ''}`}>
            {chunk.map((item, index) => (
              <div key={item.id} className="flex-1 border-2 border-slate-800 rounded-xl m-4 p-8 flex flex-col justify-between relative">

                {/* Linha de Corte no topo do segundo recibo, ou base do primeiro */}
                {index === 0 && chunk.length > 1 && (
                  <div className="absolute -bottom-4 left-0 w-full border-b-2 border-dashed border-slate-400">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-gray-500 bg-white px-2">
                      ✂️ Cortar aqui
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center border-b border-slate-300 pb-4 mb-4">
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-800">Recibo</h2>
                    <div className="border-2 border-slate-800 bg-slate-100 px-4 py-2 text-xl font-bold rounded-lg shadow-sm">
                      {formatCurrency(item.value)}
                    </div>
                  </div>

                  <p className="text-lg leading-loose text-justify text-slate-800 mt-6">
                    Recebi(emos) de <span className="font-bold">{item.payingCompany}</span>, a importância supra de <span className="font-bold px-1 bg-yellow-200">{formatCurrency(item.value)}</span> referente a <span className="font-bold">{item.description}</span>.
                  </p>
                </div>

                <div className="flex flex-col gap-12 mt-8">
                  <p className="text-lg w-full text-right text-slate-800 font-medium">
                    Goiânia - GO, {formatDateFull(item.date)}.
                  </p>

                  <div className="w-3/4 mx-auto mt-12 flex flex-col items-center">
                    <div className="w-full border-t border-slate-800"></div>
                    <span className="font-bold text-lg uppercase mt-2 text-slate-900">{item.employeeName}</span>
                  </div>
                </div>
              </div>
            ))}
            {/* Se houver apenas 1 recibo nesta página, renderizamos um espaço vazio na metade inferior para não esticar o primeiro */}
            {chunk.length === 1 && (
              <div className="flex-1 m-4 border-2 border-transparent"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

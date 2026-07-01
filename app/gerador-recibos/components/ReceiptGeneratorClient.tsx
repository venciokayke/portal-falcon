"use client";

import { useState } from "react";
import { Printer, Plus, Trash2, ReceiptText, CheckSquare, XSquare, Pencil } from "lucide-react";
import { AlertModal } from "@/components/ui/AlertModal";

const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 version 4 compliant Math.random fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [errorModal, setErrorModal] = useState<{isOpen: boolean; title: string; message: string}>({
    isOpen: false, title: "", message: ""
  });

  const [editingReceipt, setEditingReceipt] = useState<ReceiptItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editDocument, setEditDocument] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPayingCompany, setEditPayingCompany] = useState("");
  const [editDate, setEditDate] = useState("");

  const [manualPayerName, setManualPayerName] = useState("");
  const [manualPayerDocument, setManualPayerDocument] = useState("");

  const isManual = selectedEmployeeId === "__MANUAL__";
  const isManualPayer = payingCompany === "SÓCIO / PESSOA FÍSICA";

  const handleAddReceipt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployeeId || !receiptValue || !receiptDescription || !payingCompany) {
      setErrorModal({ isOpen: true, title: "Campos obrigatórios", message: "Preencha todos os campos do recibo." });
      return;
    }

    if (isManual && !manualName.trim()) {
      setErrorModal({ isOpen: true, title: "Nome obrigatório", message: "Informe o nome do recebedor." });
      return;
    }

    if (isManualPayer && !manualPayerName.trim()) {
      setErrorModal({ isOpen: true, title: "Pagador obrigatório", message: "Informe o nome do pagador (Sócio/Pessoa Física)." });
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
      id: generateUUID(),
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

  const handleOpenEditModal = (item: ReceiptItem) => {
    setEditingReceipt(item);
    setEditEmployeeName(item.employeeName);
    setEditDocument(item.document);
    setEditValue(String(item.value));
    setEditDescription(item.description);
    setEditPayingCompany(item.payingCompany);
    setEditDate(item.date);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReceipt) return;

    if (!editEmployeeName.trim() || !editValue || !editDescription.trim() || !editPayingCompany.trim() || !editDate) {
      setErrorModal({ isOpen: true, title: "Campos obrigatórios", message: "Preencha todos os campos do recibo." });
      return;
    }

    setReceiptQueue(prev => prev.map(item => {
      if (item.id !== editingReceipt.id) return item;
      return {
        ...item,
        employeeName: editEmployeeName.trim(),
        document: editDocument.trim(),
        value: Number(editValue),
        description: editDescription.trim(),
        payingCompany: editPayingCompany.trim(),
        date: editDate,
      };
    }));

    setIsEditModalOpen(false);
    setEditingReceipt(null);
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

  // Divide a fila em chunks (páginas) de 3 recibos
  const chunks: ReceiptItem[][] = [];
  for (let i = 0; i < receiptQueue.length; i += 3) {
    chunks.push(receiptQueue.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col">
      <AlertModal 
        isOpen={errorModal.isOpen} 
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
      />

      {/* Modal de Edição (Sprint 2) */}
      {isEditModalOpen && editingReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 transform transition-all animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-blue-600" />
                Editar Recibo
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Recebedor</label>
                <input
                  type="text"
                  value={editEmployeeName}
                  onChange={e => setEditEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  value={editDocument}
                  onChange={e => setEditDocument(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data do Recibo</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Pagadora</label>
                <input
                  type="text"
                  value={editPayingCompany}
                  onChange={e => setEditPayingCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referente a (Motivo)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .no-print { display: none !important; }
          /* Remove margens e paddings dos containers superiores durante a impressao para evitar pagina extra */
          html, body, main, div.space-y-6, div.px-6, div.pb-10, div.min-h-screen {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            box-shadow: none !important;
          }
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
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-bold text-gray-800 shrink-0">
                Fila de Impressão ({receiptQueue.length})
              </h3>

              {/* Controles de Ação em Lote */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-md whitespace-nowrap"
                >
                  <CheckSquare className="h-4 w-4 shrink-0" />
                  {selectedReceipts.size === receiptQueue.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </button>

                {selectedReceipts.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 transition-colors bg-red-50 px-3 py-1.5 rounded-md whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Excluir ({selectedReceipts.size})
                  </button>
                )}

                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors bg-slate-100 px-3 py-1.5 rounded-md border border-slate-300 whitespace-nowrap"
                >
                  <XSquare className="h-4 w-4 shrink-0" />
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
                <li key={item.id} className={`flex flex-wrap justify-between items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${selectedReceipts.has(item.id) ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedReceipts.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-gray-800 truncate">{index + 1}. {item.employeeName}</span>
                      <span className="text-sm text-gray-500 truncate">{item.payingCompany} • {formatDateFull(item.date)} • {item.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-md whitespace-nowrap tabular-nums">
                      {formatCurrency(item.value)}
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar este recibo"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
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

      {/* Renderização para Impressão (Agrupando de 3 em 3) */}
      <div className="hidden print:block bg-white text-black w-full">
        {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className={`print:h-[296mm] print:w-[210mm] flex flex-col box-border p-2 ${pageIndex < chunks.length - 1 ? 'print:break-after-page' : ''}`}>
            {chunk.map((item, index) => (
              <div key={item.id} className="flex-1 border border-slate-800 rounded-lg m-2 p-5 flex flex-col justify-between relative">

                {/* Linha de Corte entre os recibos */}
                {index < chunk.length - 1 && (
                  <div className="absolute -bottom-3 left-0 w-full border-b border-dashed border-slate-400">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-gray-500 bg-white px-2">
                      ✂️ Cortar aqui
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-2">
                    <h2 className="text-lg font-bold uppercase tracking-widest text-slate-800">Recibo</h2>
                    <div className="border border-slate-800 bg-slate-100 px-3 py-1 text-base font-bold rounded-md shadow-sm">
                      {formatCurrency(item.value)}
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-justify text-slate-800 mt-3">
                    Recebi(emos) de <span className="font-bold">{item.payingCompany}</span>, a importância supra de <span className="font-bold px-1 bg-yellow-200">{formatCurrency(item.value)}</span> referente a <span className="font-bold">{item.description}</span>.
                  </p>
                </div>

                <div className="flex flex-col gap-6 mt-4">
                  <p className="text-sm w-full text-right text-slate-800 font-medium">
                    Goiânia - GO, {formatDateFull(item.date)}.
                  </p>

                  <div className="w-2/3 mx-auto mt-2 flex flex-col items-center">
                    <div className="w-full border-t border-slate-800"></div>
                    <span className="font-bold text-sm uppercase mt-1 text-slate-900">{item.employeeName}</span>
                  </div>
                </div>
              </div>
            ))}
            {/* Espaçadores flexíveis para manter proporção caso a página não esteja cheia */}
            {chunk.length === 1 && (
              <>
                <div className="flex-1 m-2 border border-transparent"></div>
                <div className="flex-1 m-2 border border-transparent"></div>
              </>
            )}
            {chunk.length === 2 && (
              <div className="flex-1 m-2 border border-transparent"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

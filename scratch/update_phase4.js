const fs = require('fs');
const path = require('path');

// 1. Update PayrollClient.tsx
const payrollPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'folha', 'components', 'PayrollClient.tsx');
let payrollContent = fs.readFileSync(payrollPath, 'utf8');

payrollContent = payrollContent.replace(
  '  const [isGenerating, setIsGenerating] = useState(false);',
  '  const [isGenerating, setIsGenerating] = useState(false);\n  const [anonymousPrint, setAnonymousPrint] = useState(false);'
);

payrollContent = payrollContent.replace(
  '          <button\n            onClick={() => window.print()}\n            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"\n          >\n            <Printer className="h-4 w-4" /> Imprimir\n          </button>',
  '          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mr-2">\n            <input type="checkbox" checked={anonymousPrint} onChange={e => setAnonymousPrint(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />\n            Ocultar Nomes\n          </label>\n          <button\n            onClick={() => window.print()}\n            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"\n          >\n            <Printer className="h-4 w-4" /> Imprimir\n          </button>'
);

payrollContent = payrollContent.replace(
  '                      <span className="font-medium text-gray-900 text-sm">{row.name}</span>',
  '                      <span className={`font-medium text-gray-900 text-sm ${anonymousPrint ? "print:hidden" : ""}`}>{row.name}</span>\n                      {anonymousPrint && <span className="hidden print:inline font-medium text-gray-500 text-sm">Colaborador {row.id.substring(0,5).toUpperCase()}</span>}'
);

fs.writeFileSync(payrollPath, payrollContent, 'utf8');
console.log('PayrollClient updated');

// 2. Update relatorio-contabilidade/page.tsx
const accPagePath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'relatorio-contabilidade', 'page.tsx');
let accPageContent = fs.readFileSync(accPagePath, 'utf8');

accPageContent = accPageContent.replace(
  'export default async function RelatorioContabilidadePage() {',
  'export default async function RelatorioContabilidadePage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {\n  const resolvedParams = await searchParams;'
);

accPageContent = accPageContent.replace(
  '  const now = new Date();\n  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);\n  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);',
  `  const now = new Date();
  const month = resolvedParams.month ? Number(resolvedParams.month) - 1 : now.getMonth();
  const year = resolvedParams.year ? Number(resolvedParams.year) : now.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);`
);

accPageContent = accPageContent.replace(
  '      <AccountingReportClient data={reportData} />',
  '      <AccountingReportClient data={reportData} initialMonth={month} initialYear={year} />'
);

fs.writeFileSync(accPagePath, accPageContent, 'utf8');
console.log('Accounting page updated');

// 3. Update AccountingReportClient.tsx
const accClientPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'relatorio-contabilidade', 'components', 'AccountingReportClient.tsx');
let accClientContent = fs.readFileSync(accClientPath, 'utf8');

accClientContent = accClientContent.replace(
  'import { Printer } from "lucide-react";',
  'import { Printer, Calendar } from "lucide-react";\nimport { useState } from "react";\nimport { useRouter } from "next/navigation";'
);

accClientContent = accClientContent.replace(
  'export default function AccountingReportClient({ data }: { data: EmployeeData[] }) {',
  `const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function AccountingReportClient({ data, initialMonth, initialYear }: { data: EmployeeData[], initialMonth: number, initialYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const handleDateChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    router.push(\`/relatorio-contabilidade?month=\${newMonth + 1}&year=\${newYear}\`);
  };`
);

accClientContent = accClientContent.replace(
  '      <div className="p-4 border-b border-gray-200 flex justify-end print:hidden bg-gray-50">',
  `      <div className="p-4 border-b border-gray-200 flex justify-between items-center print:hidden bg-gray-50">
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
        </div>`
);

// Adicionar Título na impressão
accClientContent = accClientContent.replace(
  '          <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">',
  `          <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">
            <tr className="hidden print:table-row">
              <th colSpan={8} className="text-center py-4 text-xl font-bold uppercase text-black bg-white border-b-2 border-black">
                Relatório de Fechamento - {MONTHS[month]} / {year}
              </th>
            </tr>`
);


fs.writeFileSync(accClientPath, accClientContent, 'utf8');
console.log('AccountingClient updated');


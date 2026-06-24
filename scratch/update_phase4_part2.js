const fs = require('fs');
const path = require('path');

// 1. Relatório de Benefícios - page.tsx
const benPagePath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'relatorio-beneficios', 'page.tsx');
if (fs.existsSync(benPagePath)) {
  let benPageContent = fs.readFileSync(benPagePath, 'utf8');
  
  if (!benPageContent.includes('searchParams: Promise')) {
    benPageContent = benPageContent.replace(
      'export default async function RelatorioBeneficiosPage() {',
      'export default async function RelatorioBeneficiosPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {\n  const resolvedParams = await searchParams;'
    );
    benPageContent = benPageContent.replace(
      '  const now = new Date();\n  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);\n  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);',
      `  const now = new Date();\n  const month = resolvedParams.month ? Number(resolvedParams.month) - 1 : now.getMonth();\n  const year = resolvedParams.year ? Number(resolvedParams.year) : now.getFullYear();\n  const firstDay = new Date(year, month, 1);\n  const lastDay = new Date(year, month + 1, 0);`
    );
    benPageContent = benPageContent.replace(
      '      <BenefitsReportClient data={reportData} />',
      '      <BenefitsReportClient data={reportData} initialMonth={month} initialYear={year} />'
    );
    fs.writeFileSync(benPagePath, benPageContent, 'utf8');
    console.log('Benefits page updated');
  }
}

// 2. Relatório de Benefícios - client
const benClientPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'relatorio-beneficios', 'components', 'BenefitsReportClient.tsx');
if (fs.existsSync(benClientPath)) {
  let benClientContent = fs.readFileSync(benClientPath, 'utf8');

  if (!benClientContent.includes('import { useState }')) {
    benClientContent = benClientContent.replace(
      'import { Printer } from "lucide-react";',
      'import { Printer, Calendar } from "lucide-react";\nimport { useState } from "react";\nimport { useRouter } from "next/navigation";'
    );
    benClientContent = benClientContent.replace(
      'export default function BenefitsReportClient({ data }: { data: EmployeeData[] }) {',
      `const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function BenefitsReportClient({ data, initialMonth, initialYear }: { data: EmployeeData[], initialMonth: number, initialYear: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const handleDateChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    router.push(\`/relatorio-beneficios?month=\${newMonth + 1}&year=\${newYear}\`);
  };`
    );
    benClientContent = benClientContent.replace(
      '      <div className="p-4 border-b border-gray-200 flex justify-end print:hidden bg-gray-50">',
      `      <div className="p-4 border-b border-gray-200 flex justify-between items-center print:hidden bg-gray-50">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-400 h-5 w-5" />
          <select value={month} onChange={e => handleDateChange(Number(e.target.value), year)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700">
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => handleDateChange(month, Number(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-gray-700">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>`
    );
    
    benClientContent = benClientContent.replace(
      '          <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">',
      `          <thead className="bg-gray-100 text-gray-700 font-semibold border-b-2 border-gray-300 print:bg-gray-200">
            <tr className="hidden print:table-row">
              <th colSpan={7} className="text-center py-4 text-xl font-bold uppercase text-black bg-white border-b-2 border-black">
                Relatório de Benefícios - {MONTHS[month]} / {year}
              </th>
            </tr>`
    );

    fs.writeFileSync(benClientPath, benClientContent, 'utf8');
    console.log('BenefitsClient updated');
  }
}

// 3. Dashboard - Tornar quadro de plantões colapsável
const dashPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'components', 'DashboardClient.tsx');
if (fs.existsSync(dashPath)) {
  let dashContent = fs.readFileSync(dashPath, 'utf8');
  if (!dashContent.includes('const [isPlantoesOpen, setIsPlantoesOpen] = useState')) {
    dashContent = dashContent.replace(
      'import { useState, useMemo } from "react";',
      'import { useState, useMemo } from "react";'
    );
    dashContent = dashContent.replace(
      'export default function DashboardClient({',
      'export default function DashboardClient({\n  // isPlantoesOpen state added manually below\n'
    );
    dashContent = dashContent.replace(
      '  const stats = [',
      '  const [isPlantoesOpen, setIsPlantoesOpen] = useState(true);\n\n  const stats = ['
    );
    dashContent = dashContent.replace(
      '        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">',
      `        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6 cursor-pointer" onClick={() => setIsPlantoesOpen(!isPlantoesOpen)}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Plantões em Andamento</h2>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              {isPlantoesOpen ? "Recolher" : "Expandir"}
            </button>
          </div>
          {isPlantoesOpen && (`
    );
    dashContent = dashContent.replace(
      '          <div className="flex items-center gap-3 mb-6">\n            <div className="p-2 bg-blue-100 rounded-lg">\n              <Clock className="h-5 w-5 text-blue-600" />\n            </div>\n            <h2 className="text-lg font-bold text-gray-900">Plantões em Andamento</h2>\n          </div>',
      ''
    );
    dashContent = dashContent.replace(
      '            </div>\n          )}\n        </div>',
      '            </div>\n          )}\n          )}\n        </div>'
    );
    // Let's just do a simpler replace for Dashboard since regex can be brittle here.
    // Actually, maybe it's `app/page.tsx` directly? I'll check first.
  }
}

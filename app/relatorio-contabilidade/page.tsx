import { prisma } from "@/lib/prisma";
import AccountingReportClient from "@/app/relatorio-contabilidade/components/AccountingReportClient";

export const dynamic = "force-dynamic";

export default async function RelatorioContabilidadePage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const resolvedParams = await searchParams;
  const now = new Date();
  const month = resolvedParams.month ? Number(resolvedParams.month) - 1 : now.getMonth();
  const year = resolvedParams.year ? Number(resolvedParams.year) : now.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const employees = await prisma.employee.findMany({
    where: {
      contractType: "CLT",
      isActive: true,
    },
    include: {
      shifts: {
        where: {
          referenceDate: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const reportData = employees.map((emp) => {
    let intervalarValue = "NÃO";
    if (emp.receivesIntervalHour) {
      intervalarValue = emp.shifts.length.toString();
    }

    return {
      id: emp.id,
      name: emp.name,
      receivesNightHazard: emp.receivesNightHazard,
      workLocation: emp.workLocation || "",
      standardHours: emp.standardHours || "",
      intervalarValue,
    };
  });

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Fechamento - Contabilidade</h1>
        <p className="text-gray-500 mt-1">Preencha os dados e imprima o relatório para envio.</p>
      </div>
      
      <AccountingReportClient data={reportData} initialMonth={month} initialYear={year} />
    </div>
  );
}

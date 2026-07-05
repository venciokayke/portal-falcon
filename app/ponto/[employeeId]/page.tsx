import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TimeTrackingClient from "./components/TimeTrackingClient";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { getGlobalRates } from "@/actions/config";

export default async function PontoPage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const employee = await prisma.employee.findUnique({
    where: { id: resolvedParams.employeeId },
  });

  if (!employee) return notFound();

  const currentDate = new Date();
  const initialMonth = resolvedSearchParams.month ? Number(resolvedSearchParams.month) - 1 : currentDate.getMonth();
  const initialYear = resolvedSearchParams.year ? Number(resolvedSearchParams.year) : currentDate.getFullYear();

  // Obter os locais de trabalho
  const workLocations = await prisma.workLocation.findMany({
    orderBy: { name: "asc" },
  });

  // Obter a paridade específica do mês
  const monthParity = await prisma.employeeMonthParity.findUnique({
    where: {
      employeeId_month_year: {
        employeeId: employee.id,
        month: initialMonth,
        year: initialYear,
      },
    },
  });

  // Obter taxas globais
  const globalRates = await getGlobalRates();

  // Convert decimal to number for client boundary
  const serializedEmployee = {
    ...employee,
    hourlyRate: employee.hourlyRate ? employee.hourlyRate.toNumber() : null,
    baseSalary: employee.baseSalary ? employee.baseSalary.toNumber() : null,
  };

  return (
    <div className="space-y-6 relative">
      <div className="sticky top-0 z-10 bg-white shadow-sm py-2 px-4 rounded-lg print:hidden border border-gray-200">
        <Link href={`/ponto?month=${initialMonth + 1}&year=${initialYear}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
          ← Voltar para Colaboradores
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <CalendarClock className="h-6 w-6 text-blue-600" />
            Lançamento de Ponto
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Colaborador: <span className="font-medium text-gray-700">{employee.name}</span>
            {' · '}
            <span className="text-gray-600">
              {({ 'CLT': 'CLT', 'HORISTA': 'Horista', 'PJ_FIXO': 'PJ Fixo', 'PJ_HORISTA': 'PJ Horista' } as Record<string, string>)[employee.contractType as string] ?? employee.contractType}
            </span>
            {' · '}
            <span className="text-gray-600">
              {({ 'FIXED_220': '220h Mensais', 'FIXED_180': '180h Mensais', 'SCALE_12X36': 'Escala 12x36', 'CUSTOM': 'Personalizada' } as Record<string, string>)[employee.workSchedule as string] ?? employee.workSchedule}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <TimeTrackingClient
          employee={serializedEmployee}
          workLocations={workLocations}
          initialMonth={initialMonth}
          initialYear={initialYear}
          initialMonthParity={monthParity?.startParity || employee.startParity || "NONE"}
          globalRates={globalRates}
        />
      </div>
    </div>
  );
}

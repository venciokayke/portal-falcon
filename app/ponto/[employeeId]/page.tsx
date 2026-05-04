import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TimeTrackingClient from "./components/TimeTrackingClient";
import { CalendarClock } from "lucide-react";
import Link from "next/link";

export default async function PontoPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const resolvedParams = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: resolvedParams.employeeId }
  });

  if (!employee) return notFound();

  // Convert decimal to number for client boundary
  const serializedEmployee = {
    ...employee,
    hourlyRate: employee.hourlyRate.toNumber(),
    baseSalary: employee.baseSalary ? employee.baseSalary.toNumber() : null,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/colaboradores" className="text-sm text-blue-600 hover:underline">Voltar para Colaboradores</Link>
          </div>
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
        <TimeTrackingClient employee={serializedEmployee} />
      </div>
    </div>
  );
}

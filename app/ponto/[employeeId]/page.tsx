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
    hourlyRate: employee.hourlyRate ? employee.hourlyRate.toNumber() : null,
    baseSalary: employee.baseSalary ? employee.baseSalary.toNumber() : null,
  };

  return (
    <div className="space-y-6 relative">
      <div className="sticky top-0 z-10 bg-white shadow-sm py-2 px-4 rounded-lg print:hidden border border-gray-200">
        <Link href="/ponto" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
          ← Voltar para Colaboradores (Ponto)
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
            {employee.workSchedule === 'SCALE_12X36' && (
              <>
                {' · '}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${employee.startParity === 'PAR' ? 'bg-blue-100 text-blue-700' : employee.startParity === 'IMPAR' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                  {employee.startParity === 'PAR' ? '⚡ Dias Pares' : employee.startParity === 'IMPAR' ? '⚡ Dias Ímpares' : 'Paridade não definida'}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <TimeTrackingClient employee={serializedEmployee} />
      </div>
    </div>
  );
}

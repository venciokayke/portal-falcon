import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";

export default async function PontoSelectorPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Clock className="h-6 w-6 text-blue-600" />
            Lançamento de Ponto
          </h1>
          <p className="text-gray-500 text-sm mt-1">Selecione um colaborador para gerenciar os turnos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <Link
            href={`/ponto/${emp.id}`}
            key={emp.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{emp.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {({'CLT': 'CLT', 'HORISTA': 'Horista', 'PJ_FIXO': 'PJ Fixo', 'PJ_HORISTA': 'PJ Horista'} as Record<string, string>)[emp.contractType as string] ?? emp.contractType}
                {' • '}
                {({'FIXED_220': '220h Mensais', 'FIXED_180': '180h Mensais', 'SCALE_12X36': 'Escala 12x36', 'CUSTOM': 'Personalizada'} as Record<string, string>)[emp.workSchedule as string] ?? emp.workSchedule}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white border border-gray-200 rounded-xl shadow-sm">
            Nenhum colaborador ativo encontrado no sistema. Vá até a aba Colaboradores para cadastrar.
          </div>
        )}
      </div>
    </div>
  );
}

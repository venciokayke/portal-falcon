import { prisma } from "@/lib/prisma";
import ArchivedEmployeesList from "./components/ArchivedEmployeesList";
import { ArchiveRestore, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ColaboradoresArquivadosPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: false },
    orderBy: { name: "asc" },
  });

  const serializedEmployees = employees.map((emp) => ({
    ...emp,
    hourlyRate: emp.hourlyRate.toNumber(),
    baseSalary: emp.baseSalary ? emp.baseSalary.toNumber() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/colaboradores" className="text-sm text-blue-600 hover:underline">
              ← Voltar para Colaboradores Ativos
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <ArchiveRestore className="h-6 w-6 text-orange-500" />
            Colaboradores Arquivados
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Funcionários desativados. Reative-os para que voltem a aparecer no sistema.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ArchivedEmployeesList employees={serializedEmployees} />
      </div>
    </div>
  );
}

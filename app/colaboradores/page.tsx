import { prisma } from "@/lib/prisma";
import EmployeeTable from "./components/EmployeeTable";
import EmployeeFormModal from "./components/EmployeeFormModal";
import { Users } from "lucide-react";

export default async function ColaboradoresPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const serializedEmployees = employees.map((emp) => ({
    ...emp,
    hourlyRate: emp.hourlyRate.toNumber(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Colaboradores
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os funcionários ativos da empresa.</p>
        </div>
        <EmployeeFormModal />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <EmployeeTable employees={serializedEmployees} />
      </div>
    </div>
  );
}

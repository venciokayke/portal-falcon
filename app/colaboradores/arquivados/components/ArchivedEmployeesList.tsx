"use client";

import { reactivateEmployee } from "@/actions/employee";
import { ArchiveRestore } from "lucide-react";
import { useTransition } from "react";

const FORMAT_CONTRACT: Record<string, string> = {
  CLT: "CLT",
  HORISTA: "Horista",
  PJ_FIXO: "PJ Fixo",
  PJ_HORISTA: "PJ Horista",
};

const FORMAT_COMPANY: Record<string, string> = {
  FALCON_SERVICE: "Falcon Service",
  FALCON_MONITORAMENTO: "Falcon Monitoramento",
  NAO_REGISTRADO: "Não Registrado",
};

export default function ArchivedEmployeesList({ employees }: { employees: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleReactivate = (id: string, name: string) => {
    if (confirm(`Deseja reativar "${name}"?\n\nEle voltará a aparecer em todas as listas ativas do sistema.`)) {
      startTransition(() => {
        reactivateEmployee(id);
      });
    }
  };

  if (employees.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <ArchiveRestore className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Nenhum colaborador arquivado.</p>
        <p className="text-sm mt-1">Todos os funcionários cadastrados estão ativos.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-orange-50 border-b border-orange-200 text-orange-800">
          <tr>
            <th className="px-6 py-4 font-semibold">Nome</th>
            <th className="px-6 py-4 font-semibold">Contrato</th>
            <th className="px-6 py-4 font-semibold">Empresa</th>
            <th className="px-6 py-4 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {employees.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50 transition-colors opacity-75 hover:opacity-100">
              <td className="px-6 py-4 font-medium text-gray-700">{emp.name}</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {FORMAT_CONTRACT[emp.contractType] || emp.contractType}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-500">
                {FORMAT_COMPANY[emp.registrationCompany] || emp.registrationCompany}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => handleReactivate(emp.id, emp.name)}
                  disabled={isPending}
                  className="flex items-center gap-2 ml-auto text-green-600 hover:text-green-800 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                  title="Reativar Colaborador"
                >
                  <ArchiveRestore className="h-4 w-4" />
                  Reativar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

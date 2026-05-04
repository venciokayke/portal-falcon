"use client";

import { archiveEmployee, updateEmployeeParity } from "@/actions/employee";
import { Archive, Pencil } from "lucide-react";
import { useTransition } from "react";
import EmployeeFormModal from "./EmployeeFormModal";

const FORMAT_SCHEDULE: Record<string, string> = {
  SCALE_12X36: "Escala 12x36",
  FIXED_220: "Fixo (220h)",
  CUSTOM: "Personalizada"
};

const GROUPS = [
  { id: "FALCON_SERVICE", title: "Colaboradores - Falcon Service", bgColor: "bg-blue-800" },
  { id: "FALCON_MONITORAMENTO", title: "Colaboradores - Falcon Monitoramento", bgColor: "bg-indigo-800" },
  { id: "NAO_REGISTRADO", title: "Colaboradores Não Registrados", bgColor: "bg-gray-800" },
];

export default function EmployeeTable({ employees }: { employees: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleArchive = (id: string, name: string) => {
    if (confirm(`⚠️ Tem certeza que deseja arquivar "${name}"?\n\nEsta ação irá remover o colaborador de todas as listas ativas do sistema. Ele poderá ser reativado depois na lista de Funcionários Arquivados.`)) {
      startTransition(() => {
        archiveEmployee(id);
      });
    }
  };

  const handleParityChange = (id: string, newParity: any) => {
    startTransition(() => {
      updateEmployeeParity(id, newParity);
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map(group => {
        const groupEmployees = employees.filter(e => e.registrationCompany === group.id);

        if (groupEmployees.length === 0) return null;

        return (
          <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`${group.bgColor} text-white px-6 py-3 border-b border-gray-700 shadow-inner`}>
              <h3 className="font-semibold text-lg tracking-wide">{group.title}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nome</th>
                    <th className="px-6 py-4 font-semibold">Contrato</th>
                    <th className="px-6 py-4 font-semibold">Escala</th>
                    <th className="px-6 py-4 font-semibold">Valor/Hora</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                      <td className="px-6 py-4">{emp.contractType}</td>
                      <td className="px-6 py-4">
                        {emp.workSchedule === "SCALE_12X36" ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {FORMAT_SCHEDULE[emp.workSchedule]}
                            </span>
                            <select
                              value={emp.startParity}
                              onChange={(e) => handleParityChange(emp.id, e.target.value)}
                              disabled={isPending}
                              className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-shadow cursor-pointer disabled:opacity-50 text-gray-700 font-medium"
                            >
                              <option value="PAR">Par</option>
                              <option value="IMPAR">Ímpar</option>
                            </select>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {FORMAT_SCHEDULE[emp.workSchedule] || emp.workSchedule}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(emp.hourlyRate))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EmployeeFormModal 
                            employee={emp} 
                            trigger={
                              <button className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar Colaborador">
                                <Pencil className="h-5 w-5" />
                              </button>
                            }
                          />
                          <button
                            onClick={() => handleArchive(emp.id, emp.name)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                            title="Arquivar Colaborador"
                          >
                            <Archive className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      
      {employees.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Nenhum colaborador ativo encontrado no sistema.
        </div>
      )}
    </div>
  );
}

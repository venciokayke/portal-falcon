"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Log = {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { name: string; role: string };
};

type AuditData = {
  logs: Log[];
  total: number;
  page: number;
  totalPages: number;
};

export default function AuditClient({ initialData }: { initialData: AuditData }) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    router.push(`/configuracoes/auditoria?page=${newPage}`);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Data/Hora</th>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Ação</th>
              <th className="px-6 py-4">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialData.logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{log.user.name}</div>
                  <div className="text-xs text-gray-500">{log.user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate" title={log.details || ""}>
                  {log.details || "-"}
                </td>
              </tr>
            ))}
            {initialData.logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {initialData.totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Página <span className="font-medium">{initialData.page}</span> de <span className="font-medium">{initialData.totalPages}</span>
            {" "} ({initialData.total} registros)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(initialData.page - 1)}
              disabled={initialData.page <= 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(initialData.page + 1)}
              disabled={initialData.page >= initialData.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

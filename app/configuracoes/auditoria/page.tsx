import { getActivityLogs } from "@/actions/activity-log";
import AuditClient from "./components/AuditClient";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  
  let result;
  try {
    result = await getActivityLogs(page, 50);
  } catch (error: any) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          <h2 className="font-bold text-lg mb-1">Acesso Negado</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="px-6 py-8 border-b border-gray-200 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Shield className="h-6 w-6" />
          </div>
          Registro de Auditoria
        </h1>
        <p className="text-gray-500 mt-2 text-sm max-w-3xl leading-relaxed">
          Acompanhe o histórico de ações realizadas por usuários no sistema.
        </p>
      </div>
      
      <div className="p-6 flex-1">
        <AuditClient initialData={result} />
      </div>
    </div>
  );
}

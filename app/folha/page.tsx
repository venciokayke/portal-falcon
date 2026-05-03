import { Wallet } from "lucide-react";
import PayrollClient from "./components/PayrollClient";

export default function FolhaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Wallet className="h-6 w-6 text-blue-600" />
            Fechamento de Folha
          </h1>
          <p className="text-gray-500 text-sm mt-1">Conferência e edição de holerites para pagamento.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <PayrollClient />
      </div>
    </div>
  );
}

import ExtraHoursClient from "./components/ExtraHoursClient";
import { Timer } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ExtraHoursPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Timer className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Horas Extras</h1>
            <p className="text-gray-500 text-sm mt-1">Controle e apuração de horas adicionais.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ExtraHoursClient />
      </div>
    </div>
  );
}




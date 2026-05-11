import ExtraHoursClient from "./components/ExtraHoursClient";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ExtraHoursPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <div className="p-3 bg-orange-100 rounded-xl">
          <Clock className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Horas Extras</h1>
          <p className="text-gray-500 text-sm mt-1">Controle e apuração de horas adicionais (50% e 100%)</p>
        </div>
      </div>

      <ExtraHoursClient />
    </div>
  );
}

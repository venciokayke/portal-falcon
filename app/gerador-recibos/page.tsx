import { prisma } from "@/lib/prisma";
import ReceiptGeneratorClient from "./components/ReceiptGeneratorClient";
import { Receipt } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function GeradorRecibosPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, document: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6 bg-white min-h-screen pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4 pt-6 px-6 no-print">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Receipt className="h-6 w-6 text-blue-600" />
            Gerador de Recibos em Lote
          </h1>
          <p className="text-gray-500 text-sm mt-1">Crie rapidamente recibos de pagamento ou adiantamentos independentes da folha.</p>
        </div>
      </div>

      <div className="px-6">
        <ReceiptGeneratorClient employees={employees} />
      </div>
    </div>
  );
}

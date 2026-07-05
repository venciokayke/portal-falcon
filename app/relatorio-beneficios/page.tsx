import { prisma } from "@/lib/prisma";
import BenefitsReportClient from "./components/BenefitsReportClient";

export const dynamic = "force-dynamic";

export default async function RelatorioBeneficiosPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const resolvedParams = await searchParams;
  const allEmployees = await prisma.employee.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const autoLoadEmployees = [];
  const exceptionEmployees = [];

  for (const emp of allEmployees) {
    if (emp.receivesVA || emp.receivesVT) {
      autoLoadEmployees.push(emp);
    } else {
      exceptionEmployees.push(emp);
    }
  }

  const initialData = autoLoadEmployees.map((emp) => {
    return {
      id: emp.id,
      name: emp.name,
      receivesVA: emp.receivesVA,
      receivesVT: emp.receivesVT,
      vaUnid: "0",
      vaValue: "0.00",
      vtUnid: "0",
      vtValue: "0.00",
    };
  });

  const availableExceptions = exceptionEmployees.map((emp) => ({
    id: emp.id,
    name: emp.name,
    receivesVA: emp.receivesVA,
    receivesVT: emp.receivesVT,
  }));

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Benefícios</h1>
        <p className="text-gray-500 mt-1">Gerencie os valores de Vale Alimentação e Vale Transporte.</p>
      </div>
      
      <BenefitsReportClient initialData={initialData} availableExceptions={availableExceptions} />
    </div>
  );
}

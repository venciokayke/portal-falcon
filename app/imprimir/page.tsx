import { prisma } from "@/lib/prisma";
import PrintClient from "./components/PrintClient";

export default async function ImprimirPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  const serializedEmployees = employees.map(emp => ({
    ...emp,
    hourlyRate: emp.hourlyRate.toNumber(),
  }));

  return <PrintClient employees={serializedEmployees} />;
}

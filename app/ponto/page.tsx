import { prisma } from "@/lib/prisma";
import PontoSelectorClient from "./components/PontoSelectorClient";

export const dynamic = "force-dynamic";

export default async function PontoSelectorPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentDate = new Date();
  const initialMonth = resolvedSearchParams.month ? Number(resolvedSearchParams.month) : currentDate.getMonth() + 1;
  const initialYear = resolvedSearchParams.year ? Number(resolvedSearchParams.year) : currentDate.getFullYear();

  // First day of selected month
  const startDate = new Date(initialYear, initialMonth - 1, 1);
  // First day of next month
  const endDate = new Date(initialYear, initialMonth, 1);

  // Get active employees
  const activeEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Get inactive employees that have shifts in the selected month
  const archivedEmployeesWithShifts = await prisma.employee.findMany({
    where: {
      isActive: false,
      shifts: {
        some: {
          referenceDate: {
            gte: startDate,
            lt: endDate,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Combine and sort
  const employees = [...activeEmployees, ...archivedEmployeesWithShifts].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const serializedEmployees = employees.map((emp) => ({
    ...emp,
    hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : null,
    baseSalary: emp.baseSalary ? Number(emp.baseSalary) : null,
  }));

  return (
    <PontoSelectorClient
      employees={serializedEmployees}
      initialMonth={initialMonth}
      initialYear={initialYear}
    />
  );
}

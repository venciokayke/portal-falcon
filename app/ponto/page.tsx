import { prisma } from "@/lib/prisma";
import PontoSelectorClient from "./components/PontoSelectorClient";

export const dynamic = "force-dynamic";

export default async function PontoSelectorPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const currentDate = new Date();
  const initialMonth = searchParams.month ? Number(searchParams.month) : currentDate.getMonth() + 1;
  const initialYear = searchParams.year ? Number(searchParams.year) : currentDate.getFullYear();

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

  return (
    <PontoSelectorClient
      employees={employees}
      initialMonth={initialMonth}
      initialYear={initialYear}
    />
  );
}

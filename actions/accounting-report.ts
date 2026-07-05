"use server";

import { prisma } from "@/lib/prisma";

export async function getAccountingReportData(month: number, year: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const employees = await prisma.employee.findMany({
    where: {
      contractType: "CLT",
      isActive: true,
    },
    include: {
      shifts: {
        where: {
          referenceDate: {
            gte: firstDay,
            lte: lastDay,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return employees.map((emp) => {
    let intervalarValue = "NÃO";
    if (emp.receivesIntervalHour) {
      intervalarValue = emp.shifts.length.toString();
    }
    return {
      id: emp.id,
      name: emp.name,
      receivesNightHazard: emp.receivesNightHazard,
      workLocation: emp.workLocation || "",
      standardHours: emp.standardHours || "",
      intervalarValue,
    };
  });
}

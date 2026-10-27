"use server";

import { requirePermission } from "@/lib/auth";

import { calculatePayroll } from "@/utils/calculatePayroll";

import { prisma } from "@/lib/prisma";

export async function getAccountingReportData(month: number, year: number) {
  await requirePermission("VIEW_REPORTS");
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 1));

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
            lt: lastDay,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return employees.map((emp) => {
    let intervalarValue = "NÃO";
    if (emp.receivesIntervalHour) {
      intervalarValue = calculatePayroll(emp, emp.shifts, month, year).intervalHoursAdded.toString();
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

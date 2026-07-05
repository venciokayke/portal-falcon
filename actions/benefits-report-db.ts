"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveBenefitsReportEntries(
  month: number,
  year: number,
  entries: {
    employeeId: string;
    vaUnid: string;
    vaValue: string;
    vtUnid: string;
    vtValue: string;
  }[]
) {
  for (const entry of entries) {
    await prisma.benefitsReportEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: entry.employeeId,
          month,
          year,
        },
      },
      update: {
        vaUnid: entry.vaUnid,
        vaValue: entry.vaValue,
        vtUnid: entry.vtUnid,
        vtValue: entry.vtValue,
      },
      create: {
        employeeId: entry.employeeId,
        month,
        year,
        vaUnid: entry.vaUnid,
        vaValue: entry.vaValue,
        vtUnid: entry.vtUnid,
        vtValue: entry.vtValue,
      },
    });
  }
  revalidatePath("/relatorio-beneficios");
}

export async function getBenefitsReportEntries(month: number, year: number) {
  return await prisma.benefitsReportEntry.findMany({
    where: {
      month,
      year,
    },
  });
}

export async function saveMonthlyReportConfig(
  month: number,
  year: number,
  vaRate: number,
  vtRate: number
) {
  await prisma.monthlyReportConfig.upsert({
    where: {
      month_year: {
        month,
        year,
      },
    },
    update: {
      vaRate,
      vtRate,
    },
    create: {
      month,
      year,
      vaRate,
      vtRate,
    },
  });
  revalidatePath("/relatorio-beneficios");
}

export async function getMonthlyReportConfig(month: number, year: number) {
  const config = await prisma.monthlyReportConfig.findUnique({
    where: {
      month_year: {
        month,
        year,
      },
    },
  });
  
  if (config) {
    return {
      vaRate: Number(config.vaRate),
      vtRate: Number(config.vtRate),
    };
  }
  
  return null;
}

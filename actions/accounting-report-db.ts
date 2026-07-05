"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveAccountingReportEntries(
  month: number,
  year: number,
  entries: {
    employeeId: string;
    atestado: string;
    faltasFrom: string;
    faltasTo: string;
    descontosFrom: string;
    descontosTo: string;
    intervalarValue: string;
  }[]
) {
  for (const entry of entries) {
    await prisma.accountingReportEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: entry.employeeId,
          month,
          year,
        },
      },
      update: {
        atestado: entry.atestado,
        faltasFrom: entry.faltasFrom,
        faltasTo: entry.faltasTo,
        descontosFrom: entry.descontosFrom,
        descontosTo: entry.descontosTo,
        intervalarValue: entry.intervalarValue,
      },
      create: {
        employeeId: entry.employeeId,
        month,
        year,
        atestado: entry.atestado,
        faltasFrom: entry.faltasFrom,
        faltasTo: entry.faltasTo,
        descontosFrom: entry.descontosFrom,
        descontosTo: entry.descontosTo,
        intervalarValue: entry.intervalarValue,
      },
    });
  }
  revalidatePath("/relatorio-contabilidade");
}

export async function getAccountingReportEntries(month: number, year: number) {
  return await prisma.accountingReportEntry.findMany({
    where: {
      month,
      year,
    },
  });
}

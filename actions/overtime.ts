"use server";

import { prisma } from "@/lib/prisma";
import { getGlobalRates } from "@/actions/config";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getOvertimeData(month: number, year: number) {
  const records = await prisma.overtimeEntry.findMany({
    where: { 
      month, 
      year,
      employee: {
        contractType: { not: "PJ_FIXO" }
      },
      OR: [
        { status: "PAGO" },
        { employee: { isActive: true } }
      ]
    },
    include: {
      employee: {
        select: {
          name: true,
          registrationCompany: true,
          contractType: true,
          hourlyRate: true,
          baseSalary: true,
        }
      },
      approvedBy: {
        select: { name: true }
      }
    },
    orderBy: {
      employee: { name: "asc" }
    }
  });

  const globalRates = await getGlobalRates();

  return records.map(r => {
    const emp = r.employee;
    let effectiveRate = 0;
    
    if (emp.contractType === "CLT") {
      effectiveRate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.extraHourRate;
    } else {
      effectiveRate = emp.hourlyRate ? Number(emp.hourlyRate) : globalRates.workedHourRate;
    }

    return {
      id: r.id,
      employeeId: r.employeeId,
      name: emp.name,
      registrationCompany: emp.registrationCompany,
      contractType: emp.contractType,
      effectiveRate,
      hours: Number(r.hours),
      totalValue: Number(r.totalValue),
      observations: r.observations ?? "",
      status: r.status,
      approvedBy: r.approvedBy?.name ?? null,
      approvedAt: r.approvedAt?.toISOString() ?? null,
    };
  });
}

export async function generateOvertimePreview(month: number, year: number) {
  const employees = await prisma.employee.findMany({
    where: { 
      isActive: true,
      contractType: { not: "PJ_FIXO" }
    }
  });

  for (const emp of employees) {
    await prisma.overtimeEntry.upsert({
      where: {
        employeeId_month_year: {
          employeeId: emp.id,
          month,
          year,
        }
      },
      update: {}, // Não sobrescreve edições já feitas
      create: {
        employeeId: emp.id,
        month,
        year,
        hours: 0,
        totalValue: 0,
        observations: "",
        status: "PENDENTE",
      }
    });
  }
  revalidatePath("/horas-extras");
}

export async function saveOvertimeRecords(rows: { id: string, hours: number, totalValue: number, observations: string }[]) {
  for (const row of rows) {
    await prisma.overtimeEntry.update({
      where: { id: row.id },
      data: {
        hours: row.hours,
        totalValue: row.totalValue,
        observations: row.observations,
      }
    });
  }
  revalidatePath("/horas-extras");
}

export async function toggleOvertimeStatus(id: string, newStatus: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const approver = await prisma.systemUser.findFirst({
    where: { username: (session.user as any).username },
  });

  const isPaid = newStatus === "PAGO";

  await prisma.overtimeEntry.update({
    where: { id },
    data: { 
      status: newStatus,
      approvedById: isPaid ? (approver?.id ?? null) : null,
      approvedAt: isPaid ? new Date() : null,
    }
  });
  revalidatePath("/horas-extras");
}

"use server";

import { prisma } from "@/lib/prisma";
import { ContractType, WorkSchedule, StartParity, RegistrationCompany } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function addEmployee(formData: FormData) {
  const name = formData.get("name") as string;
  const contractType = formData.get("contractType") as ContractType;
  const workSchedule = formData.get("workSchedule") as WorkSchedule;
  const startParityRaw = formData.get("startParity") as string;
  const startParity = startParityRaw ? (startParityRaw as StartParity) : "NONE";
  const registrationCompanyRaw = formData.get("registrationCompany") as string;
  const registrationCompany = registrationCompanyRaw ? (registrationCompanyRaw as RegistrationCompany) : "NAO_REGISTRADO";
  
  const hourlyRateStr = formData.get("hourlyRate") as string;
  
  const pixKey = formData.get("pixKey") as string | null;
  const pixType = formData.get("pixType") as string | null;
  const receivesVA = formData.get("receivesVA") === "on";
  const receivesVT = formData.get("receivesVT") === "on";
  const receivesIntervalHour = formData.get("receivesIntervalHour") === "on";

  await prisma.employee.create({
    data: {
      name,
      contractType,
      workSchedule,
      startParity,
      registrationCompany,
      hourlyRate: hourlyRateStr,
      pixKey,
      pixType,
      receivesVA,
      receivesVT,
      receivesIntervalHour,
      isActive: true,
    },
  });

  revalidatePath("/colaboradores");
}

export async function archiveEmployee(id: string) {
  await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });

  revalidatePath("/colaboradores");
}

export async function updateEmployee(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const contractType = formData.get("contractType") as ContractType;
  const workSchedule = formData.get("workSchedule") as WorkSchedule;
  const startParityRaw = formData.get("startParity") as string;
  const startParity = startParityRaw ? (startParityRaw as StartParity) : "NONE";
  const registrationCompanyRaw = formData.get("registrationCompany") as string;
  const registrationCompany = registrationCompanyRaw ? (registrationCompanyRaw as RegistrationCompany) : "NAO_REGISTRADO";
  
  const hourlyRateStr = formData.get("hourlyRate") as string;
  
  const pixKey = formData.get("pixKey") as string | null;
  const pixType = formData.get("pixType") as string | null;
  const receivesVA = formData.get("receivesVA") === "on";
  const receivesVT = formData.get("receivesVT") === "on";
  const receivesIntervalHour = formData.get("receivesIntervalHour") === "on";

  await prisma.employee.update({
    where: { id },
    data: {
      name,
      contractType,
      workSchedule,
      startParity,
      registrationCompany,
      hourlyRate: hourlyRateStr,
      pixKey,
      pixType,
      receivesVA,
      receivesVT,
      receivesIntervalHour,
    },
  });

  revalidatePath("/colaboradores");
}

export async function updateEmployeeParity(id: string, startParity: StartParity) {
  await prisma.employee.update({
    where: { id },
    data: { startParity },
  });

  revalidatePath("/colaboradores");
}

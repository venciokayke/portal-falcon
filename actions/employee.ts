"use server";

import { prisma } from "@/lib/prisma";
import { ContractType, WorkSchedule, StartParity, RegistrationCompany } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ── Utilitário: parse do FormData ─────────────────────────────────────────────
function parseEmployeeForm(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const contractType = formData.get("contractType") as ContractType;
  const workSchedule = formData.get("workSchedule") as WorkSchedule;
  const startParityRaw = formData.get("startParity") as string;
  const startParity = startParityRaw ? (startParityRaw as StartParity) : "NONE";
  const registrationCompanyRaw = formData.get("registrationCompany") as string;
  const registrationCompany = registrationCompanyRaw ? (registrationCompanyRaw as RegistrationCompany) : "NAO_REGISTRADO";

  const hourlyRateStr = formData.get("hourlyRate") as string | null;
  const baseSalaryStr = formData.get("baseSalary") as string | null;
  const hourlyRate = Number(hourlyRateStr) || 0;
  const baseSalary = Number(baseSalaryStr) || 0;

  // Método de pagamento
  const paymentMethod = (formData.get("paymentMethod") as string | null) || "PIX";
  const pixKey = (formData.get("pixKey") as string | null)?.trim() || null;
  const pixType = (formData.get("pixType") as string | null) || null;
  const bankName = (formData.get("bankName") as string | null)?.trim() || null;
  const bankAgency = (formData.get("bankAgency") as string | null)?.trim() || null;
  const bankAccount = (formData.get("bankAccount") as string | null)?.trim() || null;

  const receivesVA = formData.get("receivesVA") === "on";
  const receivesVT = formData.get("receivesVT") === "on";
  const receivesIntervalHour = formData.get("receivesIntervalHour") === "on";
  const receivesNightHazard = formData.get("receivesNightHazard") === "on";
  const workLocation = formData.get("workLocation") as string | null;
  const standardHours = formData.get("standardHours") as string | null;
  const document = formData.get("document") as string | null;

  return {
    name, contractType, workSchedule, startParity, registrationCompany,
    hourlyRate, baseSalary, hourlyRateStr, baseSalaryStr,
    paymentMethod, pixKey, pixType, bankName, bankAgency, bankAccount,
    receivesVA, receivesVT, receivesIntervalHour,
    receivesNightHazard, workLocation, standardHours, document,
  };
}

// ── Validação de regras de negócio ───────────────────────────────────────────
function validateEmployeeData(data: ReturnType<typeof parseEmployeeForm>) {
  const errors: string[] = [];

  if (!data.name) {
    errors.push("O nome do colaborador é obrigatório.");
  }

  // Validação financeira por tipo de contrato
  if (data.contractType === "CLT" || data.contractType === "PJ_FIXO") {
    if (!data.baseSalary || data.baseSalary <= 0) {
      errors.push(
        `Contrato ${data.contractType === "CLT" ? "CLT" : "PJ Fixo"} exige um Salário Base maior que zero.`
      );
    }
  }

  if (data.contractType === "HORISTA" || data.contractType === "PJ_HORISTA") {
    if (!data.hourlyRate || data.hourlyRate <= 0) {
      errors.push(
        `Contrato ${data.contractType === "HORISTA" ? "Horista" : "PJ Horista"} exige um Valor da Hora maior que zero.`
      );
    }
  }

  // Trava NAO_REGISTRADO x CLT
  if (data.registrationCompany === "NAO_REGISTRADO" && data.contractType === "CLT") {
    errors.push("Colaboradores não registrados não podem ter contrato CLT.");
  }

  // Trava de Registro: Empresas registradas devem ser CLT
  if ((data.registrationCompany === "FALCON_SERVICE" || data.registrationCompany === "FALCON_MONITORAMENTO") && data.contractType !== "CLT") {
    errors.push(`Colaboradores da ${data.registrationCompany === "FALCON_SERVICE" ? "Falcon Service" : "Falcon Monitoramento"} devem obrigatoriamente ter contrato CLT.`);
  }

  // Validação por método de pagamento
  if (data.paymentMethod === "PIX") {
    if (!data.pixType) errors.push("Selecione o Tipo de PIX.");
    if (!data.pixKey) errors.push("A Chave PIX é obrigatória.");
  }

  if (data.paymentMethod === "BANCARIA") {
    if (!data.bankName) errors.push("Informe o nome do Banco.");
    if (!data.bankAgency) errors.push("Informe a Agência bancária.");
    if (!data.bankAccount) errors.push("Informe o número da Conta.");
  }

  // ESPECIE: nenhuma validação bancária necessária

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function addEmployee(formData: FormData) {
  const data = parseEmployeeForm(formData);
  const errors = validateEmployeeData(data);

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  await prisma.employee.create({
    data: {
      name: data.name,
      contractType: data.contractType,
      workSchedule: data.workSchedule,
      startParity: data.startParity,
      registrationCompany: data.registrationCompany,
      hourlyRate: data.hourlyRateStr || "0",
      baseSalary: data.baseSalaryStr || null,
      paymentMethod: data.paymentMethod,
      // PIX
      pixKey: data.paymentMethod === "PIX" ? data.pixKey : null,
      pixType: data.paymentMethod === "PIX" ? data.pixType : null,
      // Bancário
      bankName: data.paymentMethod === "BANCARIA" ? data.bankName : null,
      bankAgency: data.paymentMethod === "BANCARIA" ? data.bankAgency : null,
      bankAccount: data.paymentMethod === "BANCARIA" ? data.bankAccount : null,
      receivesVA: data.receivesVA,
      receivesVT: data.receivesVT,
      receivesIntervalHour: data.receivesIntervalHour,
      receivesNightHazard: data.receivesNightHazard,
      workLocation: data.workLocation,
      standardHours: data.standardHours,
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

export async function reactivateEmployee(id: string) {
  await prisma.employee.update({
    where: { id },
    data: { isActive: true },
  });

  revalidatePath("/colaboradores");
  revalidatePath("/colaboradores/arquivados");
}

export async function updateEmployee(id: string, formData: FormData) {
  const data = parseEmployeeForm(formData);
  const errors = validateEmployeeData(data);

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  await prisma.employee.update({
    where: { id },
    data: {
      name: data.name,
      contractType: data.contractType,
      workSchedule: data.workSchedule,
      startParity: data.startParity,
      registrationCompany: data.registrationCompany,
      hourlyRate: data.hourlyRateStr || "0",
      baseSalary: data.baseSalaryStr || null,
      paymentMethod: data.paymentMethod,
      // PIX
      pixKey: data.paymentMethod === "PIX" ? data.pixKey : null,
      pixType: data.paymentMethod === "PIX" ? data.pixType : null,
      // Bancário
      bankName: data.paymentMethod === "BANCARIA" ? data.bankName : null,
      bankAgency: data.paymentMethod === "BANCARIA" ? data.bankAgency : null,
      bankAccount: data.paymentMethod === "BANCARIA" ? data.bankAccount : null,
      receivesVA: data.receivesVA,
      receivesVT: data.receivesVT,
      receivesIntervalHour: data.receivesIntervalHour,
      receivesNightHazard: data.receivesNightHazard,
      workLocation: data.workLocation,
      standardHours: data.standardHours,
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

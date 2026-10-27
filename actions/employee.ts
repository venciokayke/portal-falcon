"use server";

import { requirePermission } from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { ContractType, WorkSchedule, StartParity, RegistrationCompany } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity-log";
import { logicalDate } from "@/utils/shift-time";
import { validateCertificate, MAX_CERTIFICATE_BYTES } from "@/lib/medical-certificate";

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
  if (data.contractType === "PJ_FIXO") {
    if (!data.baseSalary || data.baseSalary <= 0) {
      errors.push("Contrato PJ Fixo exige um Salário Base maior que zero.");
    }
  }

  // hourlyRate agora é opcional (exceção individual); usa taxa global se vazio

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
    if (data.pixKey && !data.pixType) {
      errors.push("Selecione o Tipo de PIX para a chave informada.");
    }
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
  await requirePermission("MANAGE_EMPLOYEES");
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
      hourlyRate: data.hourlyRateStr && Number(data.hourlyRateStr) > 0 ? data.hourlyRateStr : null,
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

  await logActivity("CRIAR_COLABORADOR", `Nome: ${data.name} | Contrato: ${data.contractType}`);
  revalidatePath("/colaboradores");
}

export async function archiveEmployee(id: string) {
  await requirePermission("MANAGE_EMPLOYEES");
  await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });

  await logActivity("ARQUIVAR_COLABORADOR", `ID: ${id}`);
  revalidatePath("/colaboradores");
}

export async function reactivateEmployee(id: string) {
  await requirePermission("MANAGE_EMPLOYEES");
  await prisma.employee.update({
    where: { id },
    data: { isActive: true },
  });

  await logActivity("REATIVAR_COLABORADOR", `ID: ${id}`);
  revalidatePath("/colaboradores");
  revalidatePath("/colaboradores/arquivados");
}

export async function updateEmployee(id: string, formData: FormData) {
  await requirePermission("MANAGE_EMPLOYEES");
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
      hourlyRate: data.hourlyRateStr && Number(data.hourlyRateStr) > 0 ? data.hourlyRateStr : null,
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

  await logActivity("EDITAR_COLABORADOR", `ID: ${id}`);
  revalidatePath("/colaboradores");
}

export async function updateEmployeeParity(id: string, startParity: StartParity) {
  await requirePermission("MANAGE_EMPLOYEES");
  await prisma.employee.update({
    where: { id },
    data: { startParity },
  });

  revalidatePath("/colaboradores");
  revalidatePath("/ponto");
  revalidatePath(`/ponto/${id}`);
}

export async function getAbsenceExemptions(employeeId: string) {
  await requirePermission("MANAGE_EMPLOYEES", "MANAGE_SHIFTS");
  const exemptions = await prisma.absenceExemption.findMany({
    where: { employeeId },
    select: { id: true, employeeId: true, startDate: true, endDate: true, reason: true, attachmentName: true },
    orderBy: { startDate: "asc" }
  });
  return exemptions.map(ex => ({
    id: ex.id,
    employeeId: ex.employeeId,
    startDate: ex.startDate.toISOString(),
    endDate: ex.endDate.toISOString(),
    reason: ex.reason,
    attachmentName: ex.attachmentName,
  }));
}

export async function addAbsenceExemption(employeeId: string, startDateStr: string, endDateStr: string, reason: string, attachment?: FormData) {
  const user = await requirePermission("MANAGE_EMPLOYEES", "MANAGE_SHIFTS");
  const startDate = logicalDate(startDateStr);
  const endDate = logicalDate(endDateStr);
  if (endDate < startDate || !reason?.trim() || reason.length > 500) throw new Error("Informe um período válido e um motivo de até 500 caracteres.");
  const file = attachment?.get('file');
  if (file != null && !(file instanceof File)) throw new Error("Anexo inválido.");
  let attachmentData: Uint8Array<ArrayBuffer> | undefined;
  let attachmentName: string | undefined;
  let attachmentMime: string | undefined;
  if (file instanceof File) {
    if (file.size > MAX_CERTIFICATE_BYTES) throw new Error("O atestado deve ter até 5 MB.");
    attachmentData = new Uint8Array(await file.arrayBuffer());
    attachmentName = validateCertificate(file.name, file.type, attachmentData);
    attachmentMime = file.type;
  }
  await prisma.absenceExemption.create({
    data: {
      employeeId,
      startDate, endDate, reason: reason.trim(), attachmentData, attachmentName, attachmentMime,
      uploadedById: user.id,
    }
  });
  await logActivity("REGISTRAR_ABONO", `Funcionário: ${employeeId} | Período: ${startDateStr} a ${endDateStr} | Anexo: ${!!attachmentData}`);
  revalidatePath(`/ponto/${employeeId}`);
  revalidatePath("/colaboradores");
  revalidatePath("/folha");
  revalidatePath("/horas-extras");
  revalidatePath("/");
}

export async function deleteAbsenceExemption(id: string) {
  await requirePermission("MANAGE_EMPLOYEES", "MANAGE_SHIFTS");
  const deleted = await prisma.absenceExemption.delete({
    where: { id }
  });
  await logActivity("EXCLUIR_ABONO", `Abono: ${id}`);
  revalidatePath(`/ponto/${deleted.employeeId}`);
  revalidatePath("/colaboradores");
  revalidatePath("/folha");
  revalidatePath("/horas-extras");
  revalidatePath("/");
}


"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/actions/activity-log";

export async function getPayrollStatus(month: number, year: number) {
  const record = await prisma.payrollStatus.findUnique({
    where: { month_year: { month, year } },
    include: {
      sentBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    }
  });

  if (!record) {
    return {
      status: "EM_DIGITACAO",
      sentAt: null,
      sentBy: null,
      approvedAt: null,
      approvedBy: null,
    };
  }

  return {
    status: record.status,
    sentAt: record.sentAt?.toISOString() ?? null,
    sentBy: record.sentBy?.name ?? null,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    approvedBy: record.approvedBy?.name ?? null,
  };
}

export async function submitPayroll(month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const user = await prisma.systemUser.findUnique({
    where: { username: (session.user as any).username },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.payrollStatus.upsert({
    where: { month_year: { month, year } },
    update: {
      status: "ENVIADO",
      sentAt: new Date(),
      sentById: user.id,
    },
    create: {
      month,
      year,
      status: "ENVIADO",
      sentAt: new Date(),
      sentById: user.id,
    }
  });

  await logActivity("ENVIAR_FOLHA_APROVACAO", `Folha enviada para aprovação. Mês/Ano: ${month}/${year}`);
  revalidatePath("/folha");
  revalidatePath("/horas-extras");
}

export async function approvePayroll(month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("Acesso negado. Apenas gestores podem aprovar.");
  }

  const user = await prisma.systemUser.findUnique({
    where: { username: (session.user as any).username },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.payrollStatus.upsert({
    where: { month_year: { month, year } },
    update: {
      status: "APROVADO",
      approvedAt: new Date(),
      approvedById: user.id,
    },
    create: {
      month,
      year,
      status: "APROVADO",
      approvedAt: new Date(),
      approvedById: user.id,
    }
  });

  await logActivity("APROVAR_FOLHA", `Folha aprovada. Mês/Ano: ${month}/${year}`);
  revalidatePath("/folha");
  revalidatePath("/horas-extras");
}

export async function rejectPayroll(month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("Acesso negado. Apenas gestores podem devolver.");
  }

  await prisma.payrollStatus.upsert({
    where: { month_year: { month, year } },
    update: {
      status: "EM_DIGITACAO",
      approvedAt: null,
      approvedById: null,
      sentAt: null,
      sentById: null,
    },
    create: {
      month,
      year,
      status: "EM_DIGITACAO",
    }
  });

  await logActivity("RECUSAR_FOLHA", `Folha devolvida para correção. Mês/Ano: ${month}/${year}`);
  revalidatePath("/folha");
  revalidatePath("/horas-extras");
}

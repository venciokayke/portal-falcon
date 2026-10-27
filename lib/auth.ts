import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export type Permission = "VIEW_DASHBOARD" | "MANAGE_EMPLOYEES" | "MANAGE_SHIFTS" | "MANAGE_PAYROLL" | "VIEW_REPORTS" | "VIEW_AUDIT";

export async function requireUser(allowPasswordChange = false) {
  const session = await getServerSession(authOptions);
  const identity = session?.user as { id?: string; authVersion?: string } | undefined;
  if (!identity?.id) throw new Error("Não autenticado. Entre novamente.");

  const user = await prisma.systemUser.findUnique({
    where: { id: identity.id },
    select: { id: true, name: true, username: true, role: true, permissions: true, mustChangePassword: true, updatedAt: true },
  });
  // Qualquer alteração da conta invalida as sessões anteriores.
  if (!user || identity.authVersion !== user.updatedAt.toISOString()) {
    throw new Error("Sessão expirada. Entre novamente.");
  }
  if (user.mustChangePassword && !allowPasswordChange) {
    throw new Error("Altere sua senha antes de continuar.");
  }
  return user;
}

export async function requirePermission(...permissions: Permission[]) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && !permissions.some(permission => user.permissions.includes(permission))) {
    throw new Error("Acesso negado.");
  }
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error("Acesso negado.");
  return user;
}

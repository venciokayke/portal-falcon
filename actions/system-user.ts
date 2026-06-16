"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Role } from "@prisma/client";

// Utilitário: retorna a sessão atual ou lança erro
async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");
  return session.user as { id: string; name: string; role: Role };
}

export async function createSystemUser(formData: FormData) {
  const currentUser = await requireSession();

  // Apenas ADMIN pode criar usuários
  if (currentUser.role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores podem criar usuários.");
  }

  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as Role) || Role.USER;

  if (!name || !username || !password) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  // Valida que o role fornecido é válido
  if (!Object.values(Role).includes(role)) {
    throw new Error("Nível de acesso inválido.");
  }

  const existing = await prisma.systemUser.findUnique({ where: { username } });
  if (existing) {
    throw new Error("Este nome de usuário já está em uso.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.systemUser.create({
    data: { name, username, password: hashedPassword, role },
  });

  revalidatePath("/configuracoes/usuarios");
}

export async function updateSystemUserPassword(id: string, password: string) {
  const currentUser = await requireSession();

  // Busca o usuário alvo
  const targetUser = await prisma.systemUser.findUnique({ where: { id } });
  if (!targetUser) throw new Error("Usuário não encontrado.");

  // RBAC: MANAGER não pode alterar senha de ADMIN
  if (targetUser.role === "ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores podem alterar a senha de outros administradores.");
  }

  if (!password || password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const isSelf = currentUser.id === id;

  await prisma.systemUser.update({
    where: { id },
    data: { 
      password: hashedPassword,
      mustChangePassword: !isSelf,
    },
  });

  revalidatePath("/configuracoes/usuarios");
}

export async function updateSystemUserRole(id: string, newRole: Role) {
  const currentUser = await requireSession();

  // Apenas ADMIN pode alterar roles
  if (currentUser.role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores podem alterar o nível de acesso.");
  }

  const targetUser = await prisma.systemUser.findUnique({ where: { id } });
  if (!targetUser) throw new Error("Usuário não encontrado.");

  // ADMIN não pode rebaixar outro ADMIN (apenas um ADMIN pode fazer isso para si mesmo ou peer)
  // Regra: ninguém pode remover o último ADMIN do sistema
  if (targetUser.role === "ADMIN" && newRole !== "ADMIN") {
    const adminCount = await prisma.systemUser.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Não é possível rebaixar o único administrador do sistema.");
    }
  }

  await prisma.systemUser.update({
    where: { id },
    data: { role: newRole },
  });

  revalidatePath("/configuracoes/usuarios");
}

export async function deleteSystemUser(id: string) {
  const currentUser = await requireSession();

  // Apenas ADMIN pode excluir usuários
  if (currentUser.role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores podem excluir usuários.");
  }

  const targetUser = await prisma.systemUser.findUnique({ where: { id } });
  if (!targetUser) throw new Error("Usuário não encontrado.");

  // Proteção: não pode excluir o último ADMIN
  if (targetUser.role === "ADMIN") {
    const adminCount = await prisma.systemUser.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Não é possível excluir o único administrador do sistema.");
    }
  }

  // Proteção: não pode se auto-excluir
  if (targetUser.id === (currentUser as any).id) {
    throw new Error("Você não pode excluir sua própria conta.");
  }

  await prisma.systemUser.delete({ where: { id } });

  revalidatePath("/configuracoes/usuarios");
}

export async function resetUserPassword(id: string) {
  const currentUser = await requireSession();

  // Apenas ADMIN ou MANAGER podem acionar
  if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
    throw new Error("Acesso negado. Apenas administradores ou gerentes podem resetar senhas.");
  }

  const targetUser = await prisma.systemUser.findUnique({ where: { id } });
  if (!targetUser) throw new Error("Usuário não encontrado.");

  // RBAC: MANAGER não pode alterar senha de ADMIN
  if (targetUser.role === "ADMIN" && currentUser.role !== "ADMIN") {
    throw new Error("Acesso negado. Apenas administradores podem alterar a senha de outros administradores.");
  }

  const hashedPassword = await bcrypt.hash("Mudar@123", 10);

  await prisma.systemUser.update({
    where: { id },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  });

  revalidatePath("/configuracoes/usuarios");

  return { message: "Senha redefinida para Mudar@123" };
}

export async function forceChangeUserPassword(password: string, confirmPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autenticado.");
  }

  const userId = (session.user as any).id;
  if (!userId) {
    throw new Error("Usuário não identificado.");
  }

  if (password !== confirmPassword) {
    throw new Error("As senhas não coincidem.");
  }

  if (!password || password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  if (password === "Mudar@123") {
    throw new Error("Você não pode usar a senha padrão provisória.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.systemUser.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  });

  return { success: true, message: "Senha alterada com sucesso." };
}

export async function hasNoSystemUsers() {
  const count = await prisma.systemUser.count();
  return count === 0;
}

export async function createInitialAdmin(formData: FormData) {
  const count = await prisma.systemUser.count();
  if (count > 0) {
    throw new Error("O administrador inicial já foi configurado.");
  }

  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!name || !username || !password) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  if (password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.systemUser.create({
    data: {
      name,
      username,
      password: hashedPassword,
      role: Role.ADMIN,
      mustChangePassword: false,
    },
  });

  return { success: true };
}


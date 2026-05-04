"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createSystemUser(formData: FormData) {
  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!name || !username || !password) {
    throw new Error("Todos os campos são obrigatórios.");
  }

  const existing = await prisma.systemUser.findUnique({
    where: { username },
  });

  if (existing) {
    throw new Error("Este nome de usuário já está em uso.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.systemUser.create({
    data: {
      name,
      username,
      password: hashedPassword,
      role: "ADMIN", // Por padrão criamos admins, pode ser expandido depois
    },
  });

  revalidatePath("/configuracoes/usuarios");
}

export async function updateSystemUserPassword(id: string, password: string) {
  if (!password || password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.systemUser.update({
    where: { id },
    data: { password: hashedPassword },
  });

  revalidatePath("/configuracoes/usuarios");
}

export async function deleteSystemUser(id: string) {
  // Opcional: impedir que o usuário delete a si mesmo (precisaria da sessão aqui)
  // Mas vamos deixar a lógica básica por enquanto.
  
  await prisma.systemUser.delete({
    where: { id },
  });

  revalidatePath("/configuracoes/usuarios");
}

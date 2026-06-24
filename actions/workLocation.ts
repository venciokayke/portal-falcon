"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWorkLocations() {
  return await prisma.workLocation.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createWorkLocation(name: string) {
  try {
    const existing = await prisma.workLocation.findUnique({
      where: { name },
    });
    if (existing) {
      return { success: false, error: "Este local já existe." };
    }
    
    await prisma.workLocation.create({
      data: { name },
    });
    
    revalidatePath("/configuracoes/locais");
    return { success: true };
  } catch (error) {
    console.error("Failed to create work location:", error);
    return { success: false, error: "Erro ao criar local de trabalho." };
  }
}

export async function deleteWorkLocation(id: string) {
  try {
    await prisma.workLocation.delete({
      where: { id },
    });
    
    revalidatePath("/configuracoes/locais");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete work location:", error);
    return { success: false, error: "Erro ao excluir local de trabalho. Pode estar em uso." };
  }
}

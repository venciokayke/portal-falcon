"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWorkLocations(includeArchived = false) {
  return await prisma.workLocation.findMany({
    // @ts-ignore
    where: includeArchived ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createWorkLocation(name: string) {
  try {
    const existing = await prisma.workLocation.findUnique({
      where: { name },
    });
    if (existing) {
      // @ts-ignore
      if (existing.isActive === false) {
        return { success: false, error: "Este local já existe e está arquivado. Restaure-o na lista de arquivados." };
      }
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

export async function archiveWorkLocation(id: string) {
  try {
    // @ts-ignore
    await prisma.workLocation.update({
      where: { id },
      // @ts-ignore
      data: { isActive: false },
    });
    
    revalidatePath("/configuracoes/locais");
    return { success: true };
  } catch (error) {
    console.error("Failed to archive work location:", error);
    return { success: false, error: "Erro ao arquivar local de trabalho." };
  }
}

export async function unarchiveWorkLocation(id: string) {
  try {
    // @ts-ignore
    await prisma.workLocation.update({
      where: { id },
      // @ts-ignore
      data: { isActive: true },
    });
    
    revalidatePath("/configuracoes/locais");
    return { success: true };
  } catch (error) {
    console.error("Failed to unarchive work location:", error);
    return { success: false, error: "Erro ao desarquivar local de trabalho." };
  }
}

import { prisma } from "@/lib/prisma";

// Uso interno: o autor já foi autenticado antes da operação.
export async function writeActivityLog(userId: string, action: string, details?: string) {
  try {
    await prisma.activityLog.create({ data: { userId, action, details } });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

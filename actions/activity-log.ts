"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function logActivity(action: string, details?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return; // Silent return if no user

    const userId = (session.user as any).id;
    if (!userId) return;

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Non-blocking
  }
}

export async function getActivityLogs(page = 1, limit = 50) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autenticado.");

  const isAdmin = (session.user as any).role === "ADMIN";
  const permissions = (session.user as any).permissions || [];
  
  if (!isAdmin && !permissions.includes("VIEW_AUDIT")) {
    throw new Error("Acesso negado.");
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, role: true } },
      },
    }),
    prisma.activityLog.count(),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}

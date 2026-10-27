"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeActivityLog } from "@/lib/activity-log";

export async function logActivity(action: string, details?: string) {
  try {
    const user = await requireUser();
    await writeActivityLog(user.id, action, details);
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Non-blocking
  }
}

export async function getActivityLogs(page = 1, limit = 50) {
  await requirePermission("VIEW_AUDIT");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Paginação inválida.");

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

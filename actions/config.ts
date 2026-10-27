"use server";

import { requireRole, requireUser } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

const KEYS = {
  EXTRA_HOUR_RATE: "extra_hour_rate",
  WORKED_HOUR_RATE: "worked_hour_rate",
};

const DEFAULTS = {
  extra_hour_rate: "13.00",
  worked_hour_rate: "13.00",
};

export async function getGlobalRates(): Promise<{ extraHourRate: number; workedHourRate: number }> {
  await requireUser();
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: Object.values(KEYS) } },
  });

  const map = Object.fromEntries(configs.map((c) => [c.key, c.value]));

  return {
    extraHourRate: parseFloat(map[KEYS.EXTRA_HOUR_RATE] ?? DEFAULTS.extra_hour_rate),
    workedHourRate: parseFloat(map[KEYS.WORKED_HOUR_RATE] ?? DEFAULTS.worked_hour_rate),
  };
}

export async function saveGlobalRates(extraHourRate: number, workedHourRate: number) {
  await requireRole("ADMIN", "MANAGER");
  if (![extraHourRate, workedHourRate].every(rate => typeof rate === "number" && Number.isFinite(rate) && rate >= 0 && rate <= 999999.99)) {
    throw new Error("Informe taxas válidas e não negativas.");
  }
  await prisma.$transaction([
    prisma.systemConfig.upsert({
      where: { key: KEYS.EXTRA_HOUR_RATE },
      update: { value: extraHourRate.toFixed(2) },
      create: { key: KEYS.EXTRA_HOUR_RATE, value: extraHourRate.toFixed(2) },
    }),
    prisma.systemConfig.upsert({
      where: { key: KEYS.WORKED_HOUR_RATE },
      update: { value: workedHourRate.toFixed(2) },
      create: { key: KEYS.WORKED_HOUR_RATE, value: workedHourRate.toFixed(2) },
    }),
  ]);
}

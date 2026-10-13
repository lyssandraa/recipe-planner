import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/week";

// Lives outside any "use server" file on purpose: everything exported from
// one of those becomes a publicly callable endpoint, and this one writes,
// so anyone could create plans for arbitrary dates without signing in.

export async function findPlanId(startDate: Date): Promise<string | null> {
  const existing = await prisma.mealPlan.findUnique({ where: { startDate } });
  return existing?.id ?? null;
}

// Finds this week's plan if it exists, otherwise creates it with 7 empty
// entries, Monday first. startDate must already be local midnight (see
// lib/week.ts's parseWeekStartParam / getWeekStart), so the same calendar
// week always resolves to the same plan.
export async function getOrCreatePlanId(startDate: Date): Promise<string> {
  const existing = await findPlanId(startDate);
  if (existing) return existing;

  const plan = await prisma.mealPlan.create({
    data: {
      startDate,
      entries: {
        create: Array.from({ length: 7 }, (_, i) => ({ date: addDays(startDate, i) })),
      },
    },
  });
  return plan.id;
}

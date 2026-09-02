// Weekly dinner planner selection logic. No LLM, just scoring and weighted
// random choice over data already in the database. Kept pure (no Prisma
// calls in here) so the whole thing is easy to reason about and test in
// isolation from app/planner/actions.ts, which does the fetching and writing.

export type EffortLabel = "Low" | "Medium" | "High";

export type PlannerRecipe = {
  id: string;
  title: string;
  cuisines: string[];
  effort: EffortLabel | null;
  batchFriendly: boolean;
  // Required ingredients (this recipe plus any linked components) not
  // currently well stocked.
  missingCount: number;
  // Required ingredients currently marked LOW, cooking this helps use them
  // up before they run out.
  lowUsedCount: number;
};

export type PlannerSlotInput = {
  // 0 (first day of the week) .. 6 (last).
  dayIndex: number;
  pinned: boolean;
  existingRecipeId: string | null;
  // Recipe ids already rejected from this specific slot in past
  // regenerations, so it doesn't cycle back to one just vetoed.
  excludedRecipeIds: string[];
};

export type PlannerSlotResult = {
  dayIndex: number;
  kind: "recipe" | "leftover" | "empty";
  recipeId: string | null;
  // Set when kind is "leftover": which day's dinner this is leftovers of.
  leftoverOfDayIndex: number | null;
};

// Fewer missing ingredients dominates (a recipe you're 4 ingredients short
// of shouldn't beat one you're fully stocked for just because it uses
// something LOW), then a bonus for using up LOW stock, then a penalty for
// repeating the previous day's cuisine, then an optional nudge toward
// effort-Low recipes while the week is still short of its low-effort
// target, and the mirror image: once the week has already hit its batch
// target through deliberate placement, a further batch-friendly pick in an
// ordinary fill slot is softly discouraged rather than landing by chance.
function scoreCandidate(
  recipe: PlannerRecipe,
  precedingCuisines: string[],
  preferLow: boolean,
  avoidBatch: boolean
): number {
  let score = 0;
  score -= recipe.missingCount * 15;
  score += recipe.lowUsedCount * 5;
  if (precedingCuisines.length > 0 && recipe.cuisines.some((c) => precedingCuisines.includes(c))) {
    score -= 8;
  }
  if (preferLow && recipe.effort === "Low") score += 6;
  if (avoidBatch && recipe.batchFriendly) score -= 6;
  return score;
}

// Proportional-to-score random pick, not a strict top-pick, so vetoing a
// slot (which excludes the current pick and re-rolls) actually tends to
// produce something different rather than the same "best" recipe every
// time. Scores are shifted to be positive first since a weight can't be
// negative.
function weightedPick(scored: { candidate: PlannerRecipe; score: number }[]): PlannerRecipe | null {
  if (scored.length === 0) return null;
  const minScore = Math.min(...scored.map((s) => s.score));
  const shift = minScore <= 0 ? -minScore + 1 : 0;
  const weights = scored.map((s) => s.score + shift);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return scored[i].candidate;
  }
  return scored[scored.length - 1].candidate;
}

export function pickForSlot(
  candidates: PlannerRecipe[],
  usedElsewhere: Set<string>,
  excludedForSlot: string[],
  precedingCuisines: string[],
  preferLow: boolean,
  avoidBatch = false
): PlannerRecipe | null {
  const eligible = candidates.filter(
    (c) => !usedElsewhere.has(c.id) && !excludedForSlot.includes(c.id)
  );
  const scored = eligible.map((c) => ({
    candidate: c,
    score: scoreCandidate(c, precedingCuisines, preferLow, avoidBatch),
  }));
  return weightedPick(scored);
}

// Fills every non-pinned slot: first places up to batchTarget batch-friendly
// dinners (spaced out, each claiming the following day as a leftover slot
// when that day is itself free to take one), then fills whatever's left
// with regular picks, preferring effort-Low recipes until lowEffortTarget
// is met for the week. Pinned slots are left exactly as they were and still
// count toward "already used" and the week's low-effort/batch totals.
export function planWeek(
  candidates: PlannerRecipe[],
  slots: PlannerSlotInput[],
  targets: { lowEffortTarget: number; batchTarget: number }
): PlannerSlotResult[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const results: PlannerSlotResult[] = slots.map((s) => ({
    dayIndex: s.dayIndex,
    kind: s.pinned && s.existingRecipeId ? "recipe" : "empty",
    recipeId: s.pinned ? s.existingRecipeId : null,
    leftoverOfDayIndex: null,
  }));

  const usedRecipeIds = new Set<string>(
    slots
      .filter((s) => s.pinned && s.existingRecipeId)
      .map((s) => s.existingRecipeId!)
  );

  const fillableDays = new Set(slots.filter((s) => !s.pinned).map((s) => s.dayIndex));
  const excludedByDay = new Map(slots.map((s) => [s.dayIndex, s.excludedRecipeIds]));

  let lowEffortPlaced = 0;
  let batchPlaced = 0;
  for (const s of slots) {
    if (s.pinned && s.existingRecipeId) {
      const r = byId.get(s.existingRecipeId);
      if (r?.effort === "Low") lowEffortPlaced++;
      if (r?.batchFriendly) batchPlaced++;
    }
  }

  function precedingCuisines(dayIndex: number): string[] {
    const prev = results.find((r) => r.dayIndex === dayIndex - 1);
    if (!prev?.recipeId) return [];
    return byId.get(prev.recipeId)?.cuisines ?? [];
  }

  function setResult(dayIndex: number, patch: Partial<PlannerSlotResult>) {
    const idx = results.findIndex((r) => r.dayIndex === dayIndex);
    results[idx] = { ...results[idx], ...patch };
  }

  // Phase 1: batch days. Each needs a free day right after it for leftovers.
  const batchNeeded = Math.max(0, targets.batchTarget - batchPlaced);
  const batchDays: number[] = [];
  if (batchNeeded > 0) {
    const spacing = Math.max(1, Math.floor(7 / batchNeeded));
    let cursor = 0;
    while (batchDays.length < batchNeeded && cursor < 7) {
      const day = cursor;
      const nextDay = day + 1;
      const dayOk = fillableDays.has(day) && !batchDays.includes(day);
      const nextOk = nextDay <= 6 && fillableDays.has(nextDay) && !batchDays.includes(nextDay);
      if (dayOk && nextOk) {
        batchDays.push(day);
        cursor += spacing;
      } else {
        cursor += 1;
      }
    }
  }

  for (const day of batchDays) {
    const batchCandidates = candidates.filter((c) => c.batchFriendly);
    const picked = pickForSlot(
      batchCandidates,
      usedRecipeIds,
      excludedByDay.get(day) ?? [],
      precedingCuisines(day),
      false
    );
    if (!picked) continue;
    setResult(day, { kind: "recipe", recipeId: picked.id });
    usedRecipeIds.add(picked.id);
    batchPlaced++;
    if (picked.effort === "Low") lowEffortPlaced++;

    const nextDay = day + 1;
    if (nextDay <= 6 && fillableDays.has(nextDay)) {
      setResult(nextDay, { kind: "leftover", recipeId: null, leftoverOfDayIndex: day });
    }
  }

  // Phase 2: whatever's still empty.
  for (const result of results) {
    if (result.kind !== "empty") continue;
    const preferLow = lowEffortPlaced < targets.lowEffortTarget;
    const avoidBatch = batchPlaced >= targets.batchTarget;
    const picked = pickForSlot(
      candidates,
      usedRecipeIds,
      excludedByDay.get(result.dayIndex) ?? [],
      precedingCuisines(result.dayIndex),
      preferLow,
      avoidBatch
    );
    if (!picked) continue;
    result.kind = "recipe";
    result.recipeId = picked.id;
    usedRecipeIds.add(picked.id);
    if (picked.effort === "Low") lowEffortPlaced++;
    if (picked.batchFriendly) batchPlaced++;
  }

  return results;
}

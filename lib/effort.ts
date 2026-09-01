export type EffortLabel = "Low" | "Medium" | "High";

// What actually matters is unattended time, not total time. Low if active
// work is under 20 min on its own, OR if it's under a third of the total
// (a 240/40 braise is mostly hands-off, so it reads Low; a 40/40 stir-fry
// is active the whole way through, so it reads Medium). Medium up to 45
// active minutes, High above that.
export function getEffortLabel(
  activeTimeMins: number | null | undefined,
  totalTimeMins?: number | null
): EffortLabel | null {
  if (activeTimeMins == null) return null;

  const mostlyUnattended =
    totalTimeMins != null && activeTimeMins < totalTimeMins / 3;
  if (activeTimeMins < 20 || mostlyUnattended) return "Low";
  if (activeTimeMins <= 45) return "Medium";
  return "High";
}

export function formatDuration(mins: number | null | undefined): string | null {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Single glanceable badge combining total time and effort, e.g. "4h · Medium effort".
export function getTimeEffortBadge(recipe: {
  totalTimeMins: number | null;
  activeTimeMins: number | null;
}): string {
  const duration = formatDuration(recipe.totalTimeMins);
  const effort = getEffortLabel(recipe.activeTimeMins, recipe.totalTimeMins);
  if (duration && effort) return `${duration} · ${effort} effort`;
  if (duration) return duration;
  if (effort) return `${effort} effort`;
  return "Time unknown";
}

// Compact duration for the recipe card time line, e.g. "4h" or "35m".
// Deliberately terser than formatDuration's "35 min" used in badges.
export function formatCompactDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Recipe card time line, e.g. "4h · 40m hands-on".
export function getHandsOnLine(recipe: {
  totalTimeMins: number | null;
  activeTimeMins: number | null;
}): string | null {
  const totalPart =
    recipe.totalTimeMins != null ? formatCompactDuration(recipe.totalTimeMins) : null;
  const activePart =
    recipe.activeTimeMins != null ? `${recipe.activeTimeMins}m hands-on` : null;
  if (totalPart && activePart) return `${totalPart} · ${activePart}`;
  return totalPart ?? activePart ?? null;
}

// Tailwind classes for the effort pill. Low is a solid sage-deep pill (white
// text); Medium is a light peridot-tint pill (needs the dark olive text,
// peridot-family colours never carry text directly); High is a warmer clay
// tone that stands out from the cool sage/peridot/mint palette.
export function getEffortPillClasses(effort: EffortLabel): string {
  switch (effort) {
    case "Low":
      return "bg-sage-deep text-white";
    case "Medium":
      return "bg-peridot-tint text-olive-text";
    case "High":
      return "bg-clay text-white";
  }
}

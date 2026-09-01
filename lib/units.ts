import type { Unit } from "@prisma/client";

export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function formatQuantityUnit(
  quantity: number | null,
  unit: Unit | null
): string {
  const parts: string[] = [];
  if (quantity != null) parts.push(formatNumber(quantity));
  // "piece" is a counting unit, not a real measure, so it reads better
  // dropped entirely: "1 Onion", not "1 piece Onion".
  if (unit && unit !== "piece") parts.push(unit);
  return parts.join(" ");
}

// One display line for a recipe ingredient, e.g. "4 piece Garlic Cloves, minced".
export function formatIngredientLine(ri: {
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  optional: boolean;
  ingredient: { name: string; plural: string | null };
}): string {
  // Only pluralize for discrete counts (no unit, or "piece"). A weight or
  // volume like "500 g" is a measure, not a count, so it stays singular.
  const isCountable = ri.unit == null || ri.unit === "piece";
  const useName =
    isCountable && ri.quantity != null && ri.quantity !== 1 && ri.ingredient.plural
      ? ri.ingredient.plural
      : ri.ingredient.name;

  const amount = formatQuantityUnit(ri.quantity, ri.unit);
  let line = amount ? `${amount} ${useName}` : useName;
  if (ri.note) line += `, ${ri.note}`;
  if (ri.optional) line += " (optional)";
  return line;
}

import type { Unit } from "@prisma/client";

// Under 10, keep a decimal (½ tsp still matters). 10 and up, round to a
// whole number. Grams over 100 round to the nearest 5, since nobody
// measures 287g of flour.
export function roundScaledQuantity(value: number, unit: Unit | null): number {
  if (unit === "g" && value > 100) {
    return Math.round(value / 5) * 5;
  }
  if (value < 10) {
    return Math.round(value * 10) / 10;
  }
  return Math.round(value);
}

// Null quantities (e.g. "Salt, to taste") are never scaled, they're
// returned untouched.
export function scaleQuantity(
  quantity: number | null,
  unit: Unit | null,
  factor: number
): number | null {
  if (quantity == null) return null;
  return roundScaledQuantity(quantity * factor, unit);
}

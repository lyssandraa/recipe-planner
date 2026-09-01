// Plain extraction of a few common per-100g nutriment fields from Open Food
// Facts' raw nutriments blob. No scoring, no colour-coding by value, just
// the numbers as declared.
export type NutritionSummaryItem = { label: string; value: string };

const FIELDS: { key: string; label: string; unit: string }[] = [
  { key: "energy-kcal_100g", label: "Energy", unit: "kcal" },
  { key: "fat_100g", label: "Fat", unit: "g" },
  { key: "saturated-fat_100g", label: "Saturates", unit: "g" },
  { key: "sugars_100g", label: "Sugars", unit: "g" },
  { key: "salt_100g", label: "Salt", unit: "g" },
  { key: "proteins_100g", label: "Protein", unit: "g" },
  { key: "carbohydrates_100g", label: "Carbs", unit: "g" },
];

export function getNutritionSummary(raw: unknown): NutritionSummaryItem[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;

  const items: NutritionSummaryItem[] = [];
  for (const field of FIELDS) {
    const value = obj[field.key];
    if (typeof value === "number") {
      items.push({ label: field.label, value: `${Math.round(value * 10) / 10}${field.unit}` });
    }
  }
  return items;
}

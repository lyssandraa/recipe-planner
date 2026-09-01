import { IconInfoCircle } from "@tabler/icons-react";
import { formatPercentage } from "@/lib/productIngredients";

const SEGMENT_COLORS = [
  "bg-sage-deep",
  "bg-peridot",
  "bg-mint",
  "bg-sage-light",
  "bg-peridot-tint",
  "bg-clay",
];

export type CompositionIngredient = {
  name: string;
  percentage: number | null;
};

// Shows a stacked composition bar when the label declares percentages, or
// a prominent note about descending-weight order when it doesn't. Never
// invents percentages that weren't on the pack.
export default function CompositionBar({
  ingredients,
}: {
  ingredients: CompositionIngredient[];
}) {
  const withPercentage = ingredients.filter(
    (i): i is { name: string; percentage: number } => i.percentage != null
  );

  if (withPercentage.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-peridot-tint p-3">
        <IconInfoCircle size={18} stroke={1.75} className="mt-0.5 shrink-0 text-olive-text" />
        <p className="text-sm text-olive-text">
          This label doesn&apos;t declare percentages. Ingredients are listed in
          descending order by weight, so the first few make up most of the product.
        </p>
      </div>
    );
  }

  const total = withPercentage.reduce((sum, i) => sum + i.percentage, 0);

  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-full">
        {withPercentage.map((ing, i) => (
          <div
            key={ing.name + i}
            className={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
            style={{ width: `${(ing.percentage / total) * 100}%` }}
            title={`${ing.name}: ${formatPercentage(ing.percentage)}%`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {withPercentage.map((ing, i) => (
          <li key={ing.name + i} className="flex items-center gap-1.5 text-xs text-sage-darker">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
            />
            {ing.name} ({formatPercentage(ing.percentage)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

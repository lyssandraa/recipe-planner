import Link from "next/link";
import { IconClock, IconStack2 } from "@tabler/icons-react";
import type { MealType } from "@prisma/client";
import { getEffortPillClasses, type EffortLabel } from "@/lib/effort";
import { getCardColorClass, renderRecipeIcon } from "@/lib/recipeVisuals";

export default function RecipeCard({
  id,
  title,
  imageUrl,
  batchFriendly,
  effort,
  timeLine,
  mealType,
  ingredientNames,
  index,
}: {
  id: string;
  title: string;
  imageUrl: string | null;
  batchFriendly: boolean;
  effort: EffortLabel | null;
  timeLine: string | null;
  mealType: MealType;
  ingredientNames: string[];
  index: number;
}) {
  const blockColorClass = getCardColorClass(id);

  return (
    <Link
      href={`/recipes/${id}`}
      style={{ animationDelay: `${index * 80}ms` }}
      className="motion-safe:animate-fade-up motion-safe:hover:-translate-y-[3px] motion-safe:transition-transform motion-safe:duration-[180ms] motion-safe:ease-out block overflow-hidden rounded-2xl bg-card shadow-sm"
    >
      <div className={`relative h-[92px] w-full ${imageUrl ? "" : blockColorClass}`}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts, not worth configuring next/image for
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute top-2 right-2 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90">
          {renderRecipeIcon(
            { title, mealType, ingredientNames },
            { size: 18, stroke: 1.75, className: "text-sage-deep" }
          )}
        </span>
        {batchFriendly && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-mint px-2 py-1 text-[11px] font-medium text-olive-text">
            <IconStack2 size={12} stroke={2} />
            batch
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate text-[15px] font-semibold text-sage-darker">{title}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          {effort && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(effort)}`}
            >
              {effort}
            </span>
          )}
          {timeLine && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <IconClock size={13} stroke={1.75} />
              {timeLine}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

import Link from "next/link";
import { IconClock, IconStack2 } from "@tabler/icons-react";
import type { ComponentType, MealType } from "@prisma/client";
import { getEffortPillClasses, type EffortLabel } from "@/lib/effort";
import { getCardColorClass, getRecipeEmoji } from "@/lib/recipeVisuals";
import { COMPONENT_TYPE_EMOJI } from "@/lib/componentTypes";

export default function RecipeCard({
  id,
  title,
  imageUrl,
  batchFriendly,
  effort,
  timeLine,
  mealType,
  componentType,
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
  componentType: ComponentType | null;
  ingredientNames: string[];
  index: number;
}) {
  const blockColorClass = getCardColorClass(id);
  // A component recipe's own type (marinade, sauce...) is a more specific
  // and recognisable icon than the generic keyword-matched recipe emoji,
  // which has no vocabulary for "this is a marinade" to begin with.
  const emoji =
    mealType === "COMPONENT" && componentType
      ? COMPONENT_TYPE_EMOJI[componentType]
      : getRecipeEmoji({ title, mealType, ingredientNames });

  return (
    <Link
      href={`/recipes/${id}`}
      style={{ animationDelay: `${index * 80}ms` }}
      className="motion-safe:animate-fade-up motion-safe:hover:-translate-y-[3px] motion-safe:transition-transform motion-safe:duration-[180ms] motion-safe:ease-out block overflow-hidden rounded-2xl bg-card shadow-sm"
    >
      <div className={`relative h-[66px] w-full ${imageUrl ? "" : blockColorClass}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts, not worth configuring next/image for
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl">
            {emoji}
          </span>
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-8"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.35))" }}
        />
        {batchFriendly && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-tint px-2 py-1 text-[11px] font-medium text-amber-text">
            <IconStack2 size={12} stroke={2} />
            batch
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          {effort && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(effort)}`}
            >
              {effort}
            </span>
          )}
          {timeLine && (
            <span className="flex items-center gap-1 text-xs text-ink-soft">
              <IconClock size={13} stroke={1.75} />
              {timeLine}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

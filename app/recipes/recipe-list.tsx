"use client";

import { useMemo, useState } from "react";
import type { MealType } from "@prisma/client";
import { IconBookOff } from "@tabler/icons-react";
import type { EffortLabel } from "@/lib/effort";
import RecipeCard from "@/app/components/recipe-card";
import EmptyState from "@/app/components/empty-state";

export type RecipeCardData = {
  id: string;
  title: string;
  imageUrl: string | null;
  batchFriendly: boolean;
  effort: EffortLabel | null;
  timeLine: string | null;
  totalTimeMins: number | null;
  mealType: MealType;
  ingredientNames: string[];
};

type Filter = "all" | "low" | "batch" | "under30";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low effort" },
  { key: "batch", label: "Batch" },
  { key: "under30", label: "Under 30m" },
];

function matchesFilter(recipe: RecipeCardData, filter: Filter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "low":
      return recipe.effort === "Low";
    case "batch":
      return recipe.batchFriendly;
    case "under30":
      return recipe.totalTimeMins != null && recipe.totalTimeMins < 30;
  }
}

export default function RecipeList({ recipes }: { recipes: RecipeCardData[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () => recipes.filter((r) => matchesFilter(r, filter)),
    [recipes, filter]
  );

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f, i) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`motion-safe:animate-pop-in shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f.key
                ? "border-sage-deep bg-sage-deep text-white"
                : "border-border-soft bg-card text-text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconBookOff size={40} stroke={1.5} />}
          message="No recipes match. Try a different filter, or add one."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((recipe, i) => (
            <RecipeCard key={recipe.id} index={i} {...recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

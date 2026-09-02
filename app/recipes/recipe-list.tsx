"use client";

import { useMemo, useState } from "react";
import type { ComponentType, CookMethod, Cuisine, MealType, Mood, Protein, Season } from "@prisma/client";
import { IconAdjustments, IconSearch, IconX } from "@tabler/icons-react";
import type { EffortLabel } from "@/lib/effort";
import {
  CUISINE_ORDER,
  CUISINE_LABELS,
  CUISINE_EMOJI,
  MOOD_ORDER,
  MOOD_LABELS,
  MOOD_EMOJI,
  PROTEIN_ORDER,
  PROTEIN_LABELS,
  PROTEIN_EMOJI,
  COOK_METHOD_ORDER,
  COOK_METHOD_LABELS,
  COOK_METHOD_EMOJI,
  SEASON_ORDER,
  SEASON_LABELS,
  SEASON_EMOJI,
} from "@/lib/tags";
import ChipGroup from "@/app/components/chip-group";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
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
  componentType: ComponentType | null;
  ingredientNames: string[];
  cuisines: Cuisine[];
  moods: Mood[];
  proteins: Protein[];
  methods: CookMethod[];
  seasons: Season[];
};

type Filter = "all" | "low" | "batch" | "under30" | "components";

const FILTERS: { key: Filter; label: string; emoji: string; tint: string; text: string }[] = [
  { key: "all", label: "All", emoji: "📖", tint: "bg-cream-grey", text: "text-cream-grey-text" },
  { key: "low", label: "Low effort", emoji: "🌿", tint: "bg-lime-tint", text: "text-green-deep" },
  { key: "batch", label: "Batch", emoji: "📦", tint: "bg-amber-tint", text: "text-amber-text" },
  { key: "under30", label: "Under 30m", emoji: "⚡", tint: "bg-teal-tint", text: "text-ink" },
  { key: "components", label: "Components", emoji: "🫙", tint: "bg-pink-tint", text: "text-ink" },
];

// Component recipes (marinades, spice mixes, sauces...) aren't dinners and
// would clutter every other view, so every filter except "components"
// itself excludes them, they only surface when explicitly asked for. This
// makes mealType just another way to categorise a recipe, findable through
// the same filter row as everything else, rather than needing a dashboard
// entry of its own.
function matchesFilter(recipe: RecipeCardData, filter: Filter): boolean {
  if (filter === "components") return recipe.mealType === "COMPONENT";
  if (recipe.mealType === "COMPONENT") return false;

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

// A dimension matches when nothing is selected in it (not filtering on
// that dimension at all), or the recipe carries at least one of the
// selected values (OR within the dimension). Dimensions themselves combine
// with AND: picking "comforting" plus "lamb" needs both to be satisfied.
function matchesDimension<T>(recipeValues: T[], selected: Set<T>): boolean {
  if (selected.size === 0) return true;
  return recipeValues.some((v) => selected.has(v));
}

type DimensionFilters = {
  cuisines: Set<Cuisine>;
  moods: Set<Mood>;
  proteins: Set<Protein>;
  methods: Set<CookMethod>;
  seasons: Set<Season>;
};

function emptyDimensionFilters(): DimensionFilters {
  return {
    cuisines: new Set(),
    moods: new Set(),
    proteins: new Set(),
    methods: new Set(),
    seasons: new Set(),
  };
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

// A blob of everything a recipe should be findable by: its title,
// ingredient names, and every tag's human label (not the raw enum value),
// so typing "italian" finds cuisine=ITALIAN the same way typing "chicken"
// finds it in the ingredients list.
function searchableText(recipe: RecipeCardData): string {
  return [
    recipe.title,
    ...recipe.ingredientNames,
    ...recipe.cuisines.map((v) => CUISINE_LABELS[v]),
    ...recipe.moods.map((v) => MOOD_LABELS[v]),
    ...recipe.proteins.map((v) => PROTEIN_LABELS[v]),
    ...recipe.methods.map((v) => COOK_METHOD_LABELS[v]),
    ...recipe.seasons.map((v) => SEASON_LABELS[v]),
  ]
    .join(" ")
    .toLowerCase();
}

export default function RecipeList({
  recipes,
  initialQuery = "",
}: {
  recipes: RecipeCardData[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [dims, setDims] = useState<DimensionFilters>(emptyDimensionFilters);
  const [panelOpen, setPanelOpen] = useState(false);
  useEscapeToClose(panelOpen, () => setPanelOpen(false));

  const activeCount =
    dims.cuisines.size + dims.moods.size + dims.proteins.size + dims.methods.size + dims.seasons.size;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter(
      (r) =>
        (q === "" || searchableText(r).includes(q)) &&
        matchesFilter(r, filter) &&
        matchesDimension(r.cuisines, dims.cuisines) &&
        matchesDimension(r.moods, dims.moods) &&
        matchesDimension(r.proteins, dims.proteins) &&
        matchesDimension(r.methods, dims.methods) &&
        matchesDimension(r.seasons, dims.seasons)
    );
  }, [recipes, query, filter, dims]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-full bg-card px-3.5 py-2.5 shadow-sm">
        <IconSearch size={16} stroke={1.75} className="shrink-0 text-ink-soft" />
        <input
          className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
          placeholder="Search titles, ingredients, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 text-ink-soft"
          >
            <IconX size={14} stroke={2} />
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {FILTERS.map((f, i) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`motion-safe:animate-pop-in flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${f.tint} ${f.text} ${
                filter === f.key ? "ring-2 ring-green-deep" : ""
              }`}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink shadow-sm ${
            activeCount > 0 ? "ring-2 ring-green-deep" : ""
          }`}
        >
          <IconAdjustments size={14} stroke={1.75} />
          Filters
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-deep text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {panelOpen && (
        <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Filter recipes</span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
            >
              <IconX size={14} stroke={2} />
            </button>
          </div>

          <ChipGroup
            label="Cuisine"
            options={CUISINE_ORDER}
            labels={CUISINE_LABELS}
            emoji={CUISINE_EMOJI}
            selected={dims.cuisines}
            onToggle={(v) => setDims((d) => ({ ...d, cuisines: toggleInSet(d.cuisines, v) }))}
          />
          <ChipGroup
            label="Mood"
            options={MOOD_ORDER}
            labels={MOOD_LABELS}
            emoji={MOOD_EMOJI}
            selected={dims.moods}
            onToggle={(v) => setDims((d) => ({ ...d, moods: toggleInSet(d.moods, v) }))}
          />
          <ChipGroup
            label="Protein"
            options={PROTEIN_ORDER}
            labels={PROTEIN_LABELS}
            emoji={PROTEIN_EMOJI}
            selected={dims.proteins}
            onToggle={(v) => setDims((d) => ({ ...d, proteins: toggleInSet(d.proteins, v) }))}
          />
          <ChipGroup
            label="Method"
            options={COOK_METHOD_ORDER}
            labels={COOK_METHOD_LABELS}
            emoji={COOK_METHOD_EMOJI}
            selected={dims.methods}
            onToggle={(v) => setDims((d) => ({ ...d, methods: toggleInSet(d.methods, v) }))}
          />
          <ChipGroup
            label="Season"
            options={SEASON_ORDER}
            labels={SEASON_LABELS}
            emoji={SEASON_EMOJI}
            selected={dims.seasons}
            onToggle={(v) => setDims((d) => ({ ...d, seasons: toggleInSet(d.seasons, v) }))}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={activeCount === 0}
              onClick={() => setDims(emptyDimensionFilters())}
              className="text-xs text-ink-soft underline disabled:opacity-40"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-full bg-green-deep px-4 py-1.5 text-xs font-medium text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          emoji="📖"
          message={query ? `Nothing matches "${query}".` : "No recipes match that filter."}
          hint="Try a different search or filter, or add a recipe."
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

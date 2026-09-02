"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ComponentType,
  CookMethod,
  Cuisine,
  MealType,
  Mood,
  Protein,
  Season,
  Unit,
} from "@prisma/client";
import { IconX } from "@tabler/icons-react";
import IngredientCombobox, {
  type IngredientOption,
} from "./ingredient-combobox";
import {
  createRecipe,
  updateRecipe,
  type RecipeComponentInput,
  type RecipeFormInput,
} from "./actions";
import type { RecipeStep } from "@/lib/instructions";
import { useBackOrFallback } from "@/lib/useBackOrFallback";
import { useUnsavedChangesWarning } from "@/lib/useUnsavedChangesWarning";
import { useToast } from "@/app/components/toast-provider";
import ChipGroup from "@/app/components/chip-group";
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
import {
  COMPONENT_TYPE_ORDER,
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_EMOJI,
} from "@/lib/componentTypes";

const MEAL_TYPES: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
  "DRINK",
  "BAKING",
  "SIDE",
  "SAUCE_CONDIMENT",
  "COMPONENT",
  "OTHER",
];
const UNITS: Unit[] = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"];

export type ComponentOption = { id: string; title: string; componentType: ComponentType | null };

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${rowIdCounter}`;
}

type IngredientRow = {
  key: string;
  ingredientId: string | null;
  ingredientName: string;
  quantity: string;
  unit: Unit | "";
  note: string;
  optional: boolean;
};

type StepRow = {
  key: string;
  text: string;
  timerMinutes: string;
  ingredientIds: string[];
};

type ComponentLinkRow = {
  key: string;
  componentRecipeId: string;
  title: string;
  note: string;
};

type InitialRecipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  mealType: MealType;
  componentType: ComponentType | null;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  batchFriendly: boolean;
  leftoverNote: string | null;
  source: string | null;
  steps: RecipeStep[];
  ingredients: {
    ingredientId: string;
    name: string;
    quantity: number | null;
    unit: Unit | null;
    note: string | null;
    optional: boolean;
  }[];
  cuisines: Cuisine[];
  moods: Mood[];
  proteins: Protein[];
  methods: CookMethod[];
  seasons: Season[];
  components: { componentRecipeId: string; title: string; note: string | null }[];
};

function toComponentRows(initial?: InitialRecipe["components"]): ComponentLinkRow[] {
  if (!initial) return [];
  return initial.map((c) => ({
    key: nextRowId(),
    componentRecipeId: c.componentRecipeId,
    title: c.title,
    note: c.note ?? "",
  }));
}

function toIngredientRows(initial?: InitialRecipe["ingredients"]): IngredientRow[] {
  if (!initial || initial.length === 0) {
    return [
      {
        key: nextRowId(),
        ingredientId: null,
        ingredientName: "",
        quantity: "",
        unit: "",
        note: "",
        optional: false,
      },
    ];
  }
  return initial.map((i) => ({
    key: nextRowId(),
    ingredientId: i.ingredientId,
    ingredientName: i.name,
    quantity: i.quantity != null ? String(i.quantity) : "",
    unit: i.unit ?? "",
    note: i.note ?? "",
    optional: i.optional,
  }));
}

function toStepRows(initial?: RecipeStep[]): StepRow[] {
  if (!initial || initial.length === 0) {
    return [{ key: nextRowId(), text: "", timerMinutes: "", ingredientIds: [] }];
  }
  return initial.map((s) => ({
    key: nextRowId(),
    text: s.text,
    timerMinutes:
      s.timerSeconds != null ? String(Math.round(s.timerSeconds / 60)) : "",
    ingredientIds: s.ingredientIds ?? [],
  }));
}

export default function RecipeForm({
  ingredientOptions,
  componentOptions,
  initial,
}: {
  ingredientOptions: IngredientOption[];
  componentOptions: ComponentOption[];
  initial?: InitialRecipe;
}) {
  const [options, setOptions] = useState<IngredientOption[]>(ingredientOptions);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState(
    initial?.servings != null ? String(initial.servings) : ""
  );
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? "DINNER");
  const [componentType, setComponentType] = useState<ComponentType | null>(
    initial?.componentType ?? null
  );
  const [totalTimeMins, setTotalTimeMins] = useState(
    initial?.totalTimeMins != null ? String(initial.totalTimeMins) : ""
  );
  const [activeTimeMins, setActiveTimeMins] = useState(
    initial?.activeTimeMins != null ? String(initial.activeTimeMins) : ""
  );
  const [batchFriendly, setBatchFriendly] = useState(initial?.batchFriendly ?? false);
  const [leftoverNote, setLeftoverNote] = useState(initial?.leftoverNote ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() =>
    toIngredientRows(initial?.ingredients)
  );
  const [stepRows, setStepRows] = useState<StepRow[]>(() => toStepRows(initial?.steps));
  const [cuisines, setCuisines] = useState<Set<Cuisine>>(() => new Set(initial?.cuisines));
  const [moods, setMoods] = useState<Set<Mood>>(() => new Set(initial?.moods));
  const [proteins, setProteins] = useState<Set<Protein>>(() => new Set(initial?.proteins));
  const [methods, setMethods] = useState<Set<CookMethod>>(() => new Set(initial?.methods));
  const [seasons, setSeasons] = useState<Set<Season>>(() => new Set(initial?.seasons));
  const [componentRows, setComponentRows] = useState<ComponentLinkRow[]>(() =>
    toComponentRows(initial?.components)
  );
  const [componentToAdd, setComponentToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const cancelHref = initial ? `/recipes/${initial.id}` : "/recipes";
  const goBack = useBackOrFallback(cancelHref);

  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDirty(true);
  }, [
    title,
    description,
    servings,
    mealType,
    componentType,
    totalTimeMins,
    activeTimeMins,
    batchFriendly,
    leftoverNote,
    source,
    ingredientRows,
    stepRows,
    cuisines,
    moods,
    proteins,
    methods,
    seasons,
    componentRows,
  ]);

  function handleCancel() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    goBack();
  }

  function updateIngredientRow(key: string, patch: Partial<IngredientRow>) {
    setIngredientRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function addIngredientRow() {
    setIngredientRows((rows) => [
      ...rows,
      {
        key: nextRowId(),
        ingredientId: null,
        ingredientName: "",
        quantity: "",
        unit: "",
        note: "",
        optional: false,
      },
    ]);
  }

  function removeIngredientRow(key: string) {
    setIngredientRows((rows) => rows.filter((row) => row.key !== key));
  }

  function updateStepRow(key: string, patch: Partial<StepRow>) {
    setStepRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function addStepRow() {
    setStepRows((rows) => [
      ...rows,
      { key: nextRowId(), text: "", timerMinutes: "", ingredientIds: [] },
    ]);
  }

  function toggleStepIngredient(key: string, ingredientId: string) {
    setStepRows((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const has = row.ingredientIds.includes(ingredientId);
        return {
          ...row,
          ingredientIds: has
            ? row.ingredientIds.filter((id) => id !== ingredientId)
            : [...row.ingredientIds, ingredientId],
        };
      })
    );
  }

  function removeStepRow(key: string) {
    setStepRows((rows) => rows.filter((row) => row.key !== key));
  }

  function addComponentLink() {
    if (!componentToAdd) return;
    const option = componentOptions.find((o) => o.id === componentToAdd);
    if (!option) return;
    if (componentRows.some((r) => r.componentRecipeId === option.id)) return;
    setComponentRows((rows) => [
      ...rows,
      { key: nextRowId(), componentRecipeId: option.id, title: option.title, note: "" },
    ]);
    setComponentToAdd("");
  }

  function updateComponentRow(key: string, note: string) {
    setComponentRows((rows) => rows.map((r) => (r.key === key ? { ...r, note } : r)));
  }

  function removeComponentRow(key: string) {
    setComponentRows((rows) => rows.filter((r) => r.key !== key));
  }

  function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const chosenIngredients = ingredientRows.filter((row) => row.ingredientId);
    if (chosenIngredients.length === 0) {
      setError("Add at least one ingredient.");
      return;
    }

    const steps: RecipeStep[] = stepRows
      .filter((row) => row.text.trim())
      .map((row) => {
        const step: RecipeStep = { text: row.text.trim() };
        const mins = Number(row.timerMinutes);
        if (row.timerMinutes.trim() && !Number.isNaN(mins) && mins > 0) {
          step.timerSeconds = Math.round(mins * 60);
        }
        if (row.ingredientIds.length > 0) {
          step.ingredientIds = row.ingredientIds;
        }
        return step;
      });

    const componentLinks: RecipeComponentInput[] = componentRows.map((row) => ({
      componentRecipeId: row.componentRecipeId,
      note: row.note.trim() || null,
    }));

    const input: RecipeFormInput = {
      title: title.trim(),
      description: description.trim() || null,
      servings: servings.trim() ? Number(servings) : null,
      mealType,
      componentType: mealType === "COMPONENT" ? componentType : null,
      totalTimeMins: totalTimeMins.trim() ? Number(totalTimeMins) : null,
      activeTimeMins: activeTimeMins.trim() ? Number(activeTimeMins) : null,
      batchFriendly,
      leftoverNote: leftoverNote.trim() || null,
      source: source.trim() || null,
      steps,
      ingredients: chosenIngredients.map((row) => ({
        ingredientId: row.ingredientId!,
        quantity: row.quantity.trim() ? Number(row.quantity) : null,
        unit: row.unit || null,
        note: row.note.trim() || null,
        optional: row.optional,
      })),
      cuisines: Array.from(cuisines),
      moods: Array.from(moods),
      proteins: Array.from(proteins),
      methods: Array.from(methods),
      seasons: Array.from(seasons),
      components: componentLinks,
    };

    startTransition(async () => {
      try {
        setDirty(false);
        if (initial) {
          await updateRecipe(initial.id, input);
          toast("Recipe saved");
          router.push(`/recipes/${initial.id}`);
        } else {
          const recipe = await createRecipe(input);
          toast("Recipe saved");
          router.push(`/recipes/${recipe.id}`);
        }
      } catch (e) {
        setDirty(true);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Title</label>
        <input
          className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Meal type</label>
          <select
            className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
          >
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {mt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Servings</label>
          <input
            type="number"
            min={0}
            className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      {mealType === "COMPONENT" && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Component type</label>
          <div className="flex flex-wrap gap-2">
            {COMPONENT_TYPE_ORDER.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => setComponentType(ct)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  componentType === ct
                    ? "bg-green-deep text-white"
                    : "bg-cream-grey text-cream-grey-text"
                }`}
              >
                <span className="mr-1">{COMPONENT_TYPE_EMOJI[ct]}</span>
                {COMPONENT_TYPE_LABELS[ct]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Total time (mins)</label>
          <input
            type="number"
            min={0}
            className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
            value={totalTimeMins}
            onChange={(e) => setTotalTimeMins(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Active time (mins)</label>
          <input
            type="number"
            min={0}
            className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
            value={activeTimeMins}
            onChange={(e) => setActiveTimeMins(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={batchFriendly}
          onChange={(e) => setBatchFriendly(e.target.checked)}
        />
        Batch friendly
      </label>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Leftover note</label>
        <textarea
          className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
          rows={2}
          value={leftoverNote}
          onChange={(e) => setLeftoverNote(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Source</label>
        <input
          className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
          placeholder="URL or free text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <p className="-mb-2 text-xs text-ink-soft">
        Tags are all optional, pick whichever fit.
      </p>

      <ChipGroup
        label="Cuisine"
        options={CUISINE_ORDER}
        labels={CUISINE_LABELS}
        emoji={CUISINE_EMOJI}
        selected={cuisines}
        onToggle={(v) => setCuisines((s) => toggleInSet(s, v))}
      />
      <ChipGroup
        label="Mood"
        options={MOOD_ORDER}
        labels={MOOD_LABELS}
        emoji={MOOD_EMOJI}
        selected={moods}
        onToggle={(v) => setMoods((s) => toggleInSet(s, v))}
      />
      <ChipGroup
        label="Protein"
        options={PROTEIN_ORDER}
        labels={PROTEIN_LABELS}
        emoji={PROTEIN_EMOJI}
        selected={proteins}
        onToggle={(v) => setProteins((s) => toggleInSet(s, v))}
      />
      <ChipGroup
        label="Method"
        options={COOK_METHOD_ORDER}
        labels={COOK_METHOD_LABELS}
        emoji={COOK_METHOD_EMOJI}
        selected={methods}
        onToggle={(v) => setMethods((s) => toggleInSet(s, v))}
      />
      <ChipGroup
        label="Season"
        options={SEASON_ORDER}
        labels={SEASON_LABELS}
        emoji={SEASON_EMOJI}
        selected={seasons}
        onToggle={(v) => setSeasons((s) => toggleInSet(s, v))}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Ingredients</h2>
        <div className="flex flex-col gap-3">
          {ingredientRows.map((row) => (
            <div
              key={row.key}
              className="rounded-lg border border-border-soft bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <IngredientCombobox
                    options={options}
                    value={
                      row.ingredientId
                        ? { id: row.ingredientId, name: row.ingredientName }
                        : null
                    }
                    onChange={(option) =>
                      updateIngredientRow(row.key, {
                        ingredientId: option.id,
                        ingredientName: option.name,
                      })
                    }
                    onCreated={(option) =>
                      setOptions((prev) => [...prev, option])
                    }
                  />
                </div>
                <button
                  type="button"
                  className="mt-1.5 shrink-0 text-xs text-red-600"
                  onClick={() => removeIngredientRow(row.key)}
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="Quantity"
                  className="rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  value={row.quantity}
                  onChange={(e) =>
                    updateIngredientRow(row.key, { quantity: e.target.value })
                  }
                />
                <select
                  className="rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  value={row.unit}
                  onChange={(e) =>
                    updateIngredientRow(row.key, {
                      unit: e.target.value as Unit | "",
                    })
                  }
                >
                  <option value="">No unit</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <input
                placeholder="Note, e.g. finely chopped"
                className="mt-2 w-full rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                value={row.note}
                onChange={(e) =>
                  updateIngredientRow(row.key, { note: e.target.value })
                }
              />

              <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5"
                  checked={row.optional}
                  onChange={(e) =>
                    updateIngredientRow(row.key, { optional: e.target.checked })
                  }
                />
                Optional
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredientRow}
          className="mt-2 text-sm text-green-deep"
        >
          + Add ingredient
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Components used</h2>
        <p className="-mt-1 mb-2 text-xs text-ink-soft">
          Link a marinade, sauce or other component instead of duplicating its ingredients.
        </p>
        {componentRows.length > 0 && (
          <div className="mb-2 flex flex-col gap-2">
            {componentRows.map((row) => (
              <div key={row.key} className="rounded-lg border border-border-soft bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{row.title}</span>
                  <button
                    type="button"
                    onClick={() => removeComponentRow(row.key)}
                    aria-label="Remove component"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-soft"
                  >
                    <IconX size={14} stroke={2} />
                  </button>
                </div>
                <input
                  placeholder="Note, e.g. marinate the lamb overnight in this"
                  className="mt-2 w-full rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  value={row.note}
                  onChange={(e) => updateComponentRow(row.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
        {componentOptions.length > 0 && (
          <div className="flex gap-2">
            <select
              className="flex-1 rounded-[12px] border border-border-soft px-3 py-2 text-sm"
              value={componentToAdd}
              onChange={(e) => setComponentToAdd(e.target.value)}
            >
              <option value="">Choose a component…</option>
              {componentOptions
                .filter((o) => !componentRows.some((r) => r.componentRecipeId === o.id))
                .filter((o) => o.id !== initial?.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!componentToAdd}
              onClick={addComponentLink}
              className="shrink-0 rounded-[12px] border border-green-deep px-3 py-2 text-sm font-medium text-green-deep disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Steps</h2>
        <div className="flex flex-col gap-3">
          {stepRows.map((row, i) => (
            <div
              key={row.key}
              className="rounded-lg border border-border-soft bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-ink-soft">
                  {i + 1}.
                </span>
                <textarea
                  className="flex-1 rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  rows={2}
                  value={row.text}
                  onChange={(e) => updateStepRow(row.key, { text: e.target.value })}
                />
                <button
                  type="button"
                  className="mt-1.5 shrink-0 text-xs text-red-600"
                  onClick={() => removeStepRow(row.key)}
                >
                  Remove
                </button>
              </div>
              <input
                type="number"
                min={0}
                placeholder="Timer (minutes, optional)"
                className="mt-2 w-40 rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                value={row.timerMinutes}
                onChange={(e) =>
                  updateStepRow(row.key, { timerMinutes: e.target.value })
                }
              />

              {ingredientRows.some((r) => r.ingredientId) && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-ink-soft">
                    Uses (shown in cook mode)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ingredientRows
                      .filter((r) => r.ingredientId)
                      .map((r) => {
                        const active = row.ingredientIds.includes(r.ingredientId!);
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => toggleStepIngredient(row.key, r.ingredientId!)}
                            className={`rounded-full px-2 py-1 text-xs ${
                              active
                                ? "bg-green-deep text-white"
                                : "border border-border-soft text-ink-soft"
                            }`}
                          >
                            {r.ingredientName}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStepRow}
          className="mt-2 text-sm text-green-deep"
        >
          + Add step
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex-1 rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save recipe"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="rounded-[12px] border border-border-soft px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

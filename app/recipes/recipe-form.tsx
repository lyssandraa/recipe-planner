"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MealType, Unit } from "@prisma/client";
import IngredientCombobox, {
  type IngredientOption,
} from "./ingredient-combobox";
import {
  createRecipe,
  updateRecipe,
  type RecipeFormInput,
} from "./actions";
import type { RecipeStep } from "@/lib/instructions";
import { useBackOrFallback } from "@/lib/useBackOrFallback";
import { useUnsavedChangesWarning } from "@/lib/useUnsavedChangesWarning";
import { useToast } from "@/app/components/toast-provider";

const MEAL_TYPES: MealType[] = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
  "DRINK",
  "BAKING",
  "SIDE",
  "SAUCE_CONDIMENT",
  "OTHER",
];
const UNITS: Unit[] = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"];

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

type InitialRecipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  mealType: MealType;
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
};

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
  initial,
}: {
  ingredientOptions: IngredientOption[];
  initial?: InitialRecipe;
}) {
  const [options, setOptions] = useState<IngredientOption[]>(ingredientOptions);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState(
    initial?.servings != null ? String(initial.servings) : ""
  );
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? "DINNER");
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
    totalTimeMins,
    activeTimeMins,
    batchFriendly,
    leftoverNote,
    source,
    ingredientRows,
    stepRows,
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

    const input: RecipeFormInput = {
      title: title.trim(),
      description: description.trim() || null,
      servings: servings.trim() ? Number(servings) : null,
      mealType,
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
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Meal type</label>
          <select
            className="rounded-md border border-border-soft px-3 py-2 text-sm"
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
            className="rounded-md border border-border-soft px-3 py-2 text-sm"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Total time (mins)</label>
          <input
            type="number"
            min={0}
            className="rounded-md border border-border-soft px-3 py-2 text-sm"
            value={totalTimeMins}
            onChange={(e) => setTotalTimeMins(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Active time (mins)</label>
          <input
            type="number"
            min={0}
            className="rounded-md border border-border-soft px-3 py-2 text-sm"
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
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          rows={2}
          value={leftoverNote}
          onChange={(e) => setLeftoverNote(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Source</label>
        <input
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          placeholder="URL or free text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-sage-darker">Ingredients</h2>
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
                  className="rounded-md border border-border-soft px-2 py-1.5 text-sm"
                  value={row.quantity}
                  onChange={(e) =>
                    updateIngredientRow(row.key, { quantity: e.target.value })
                  }
                />
                <select
                  className="rounded-md border border-border-soft px-2 py-1.5 text-sm"
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
                className="mt-2 w-full rounded-md border border-border-soft px-2 py-1.5 text-sm"
                value={row.note}
                onChange={(e) =>
                  updateIngredientRow(row.key, { note: e.target.value })
                }
              />

              <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
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
          className="mt-2 text-sm text-sage-deep"
        >
          + Add ingredient
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-sage-darker">Steps</h2>
        <div className="flex flex-col gap-3">
          {stepRows.map((row, i) => (
            <div
              key={row.key}
              className="rounded-lg border border-border-soft bg-card p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-text-muted">
                  {i + 1}.
                </span>
                <textarea
                  className="flex-1 rounded-md border border-border-soft px-2 py-1.5 text-sm"
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
                className="mt-2 w-40 rounded-md border border-border-soft px-2 py-1.5 text-sm"
                value={row.timerMinutes}
                onChange={(e) =>
                  updateStepRow(row.key, { timerMinutes: e.target.value })
                }
              />

              {ingredientRows.some((r) => r.ingredientId) && (
                <div className="mt-2">
                  <p className="mb-1 text-xs text-text-muted">
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
                                ? "bg-sage-deep text-white"
                                : "border border-border-soft text-text-muted"
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
          className="mt-2 text-sm text-sage-deep"
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
          className="flex-1 rounded-md bg-sage-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save recipe"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="rounded-md border border-border-soft px-4 py-2.5 text-sm font-medium text-sage-darker disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

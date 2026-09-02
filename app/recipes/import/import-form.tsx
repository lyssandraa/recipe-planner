"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import type { MealType, Unit } from "@prisma/client";
import IngredientCombobox, {
  type IngredientOption,
} from "@/app/recipes/ingredient-combobox";
import {
  parseRecipeFromUrl,
  saveImportedRecipe,
  type ImportPreview,
  type ImportedIngredientRow,
} from "./actions";
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
  return `import-row-${rowIdCounter}`;
}

type IngredientRow = ImportedIngredientRow & {
  key: string;
  ingredientName: string;
};

type StepRow = { key: string; text: string };

export default function ImportForm({
  ingredientOptions,
}: {
  ingredientOptions: IngredientOption[];
}) {
  const [url, setUrl] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, startFetching] = useTransition();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [options, setOptions] = useState<IngredientOption[]>(ingredientOptions);
  const router = useRouter();
  const goBack = useBackOrFallback("/recipes");

  function handleFetch() {
    setFetchError(null);
    const trimmed = url.trim();
    if (!trimmed) return;
    startFetching(async () => {
      try {
        const result = await parseRecipeFromUrl(trimmed);
        setPreview(result);
      } catch (e) {
        setFetchError(
          e instanceof Error ? e.message : "Couldn't read that page."
        );
      }
    });
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 self-start text-sm text-ink-soft"
        >
          <IconArrowLeft size={15} stroke={2} />
          Back
        </button>
        <label className="text-sm font-medium">Recipe URL</label>
        <input
          className="rounded-[12px] border border-border-soft px-3 py-2 text-sm"
          placeholder="https://example.com/some-recipe"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {fetchError && <p className="text-sm text-terracotta-text">{fetchError}</p>}
        <button
          type="button"
          disabled={isFetching || !url.trim()}
          onClick={handleFetch}
          className="rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isFetching ? "Fetching…" : "Fetch recipe"}
        </button>
        <p className="text-xs text-ink-soft">
          Nothing is saved until you review and confirm on the next screen.
        </p>
      </div>
    );
  }

  return (
    <ReviewStep
      preview={preview}
      sourceUrl={url.trim()}
      options={options}
      onOptionsChange={setOptions}
      onStartOver={() => {
        setPreview(null);
        setUrl("");
      }}
      onSaved={(recipeId) => router.push(`/recipes/${recipeId}`)}
    />
  );
}

function ReviewStep({
  preview,
  sourceUrl,
  options,
  onOptionsChange,
  onStartOver,
  onSaved,
}: {
  preview: ImportPreview;
  sourceUrl: string;
  options: IngredientOption[];
  onOptionsChange: (options: IngredientOption[]) => void;
  onStartOver: () => void;
  onSaved: (recipeId: string) => void;
}) {
  const [title, setTitle] = useState(preview.title);
  const [description, setDescription] = useState(preview.description ?? "");
  const [servings, setServings] = useState(
    preview.servings != null ? String(preview.servings) : ""
  );
  const [mealType, setMealType] = useState<MealType>("DINNER");
  const [totalTimeMins, setTotalTimeMins] = useState(
    preview.totalTimeMins != null ? String(preview.totalTimeMins) : ""
  );
  const [activeTimeMins, setActiveTimeMins] = useState(
    preview.activeTimeMins != null ? String(preview.activeTimeMins) : ""
  );
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() =>
    preview.ingredients.map((ing) => ({
      ...ing,
      key: nextRowId(),
      ingredientName:
        options.find((o) => o.id === ing.matchedIngredientId)?.name ?? "",
    }))
  );
  const [stepRows, setStepRows] = useState<StepRow[]>(() =>
    preview.steps.map((s) => ({ key: nextRowId(), text: s.text }))
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const goBack = useBackOrFallback("/recipes");

  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDirty(true);
  }, [title, description, servings, mealType, totalTimeMins, activeTimeMins, ingredientRows, stepRows]);

  function handleLeave() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    goBack();
  }

  function updateIngredientRow(key: string, patch: Partial<IngredientRow>) {
    setIngredientRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  }

  function removeIngredientRow(key: string) {
    setIngredientRows((rows) => rows.filter((row) => row.key !== key));
  }

  function updateStepRow(key: string, text: string) {
    setStepRows((rows) => rows.map((row) => (row.key === key ? { ...row, text } : row)));
  }

  function removeStepRow(key: string) {
    setStepRows((rows) => rows.filter((row) => row.key !== key));
  }

  function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const unresolved = ingredientRows.filter((row) => !row.matchedIngredientId);
    if (unresolved.length > 0) {
      setError(
        `Match or create an ingredient for: ${unresolved.map((r) => r.name).join(", ")}`
      );
      return;
    }
    if (ingredientRows.length === 0) {
      setError("This recipe needs at least one ingredient.");
      return;
    }

    startTransition(async () => {
      try {
        setDirty(false);
        const recipe = await saveImportedRecipe({
          title: title.trim(),
          description: description.trim() || null,
          servings: servings.trim() ? Number(servings) : null,
          mealType,
          totalTimeMins: totalTimeMins.trim() ? Number(totalTimeMins) : null,
          activeTimeMins: activeTimeMins.trim() ? Number(activeTimeMins) : null,
          imageUrl: preview.imageUrl,
          source: sourceUrl,
          steps: stepRows.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim() })),
          ingredients: ingredientRows.map((row) => ({
            ingredientId: row.matchedIngredientId!,
            quantity: row.quantity,
            unit: row.unit,
            note: row.note,
          })),
        });
        toast("Recipe saved");
        onSaved(recipe.id);
      } catch (e) {
        setDirty(true);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleLeave}
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft"
        >
          <IconArrowLeft size={17} stroke={2} />
        </button>
        <p className="flex-1 text-sm text-ink-soft">Review before saving.</p>
        <button
          type="button"
          onClick={() => {
            if (dirty && !confirm("Discard unsaved changes?")) return;
            onStartOver();
          }}
          className="shrink-0 text-sm text-green-deep"
        >
          Start over
        </button>
      </div>

      {preview.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host from the source page
        <img
          src={preview.imageUrl}
          alt=""
          className="h-40 w-full rounded-2xl object-cover"
        />
      )}

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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-green-deep">Ingredients</h2>
        <div className="flex flex-col gap-3">
          {ingredientRows.map((row) => (
            <div
              key={row.key}
              className={`rounded-lg border bg-card p-3 ${
                row.matchedIngredientId ? "border-border-soft" : "border-terracotta"
              }`}
            >
              <p className="mb-2 text-xs text-ink-soft">&quot;{row.raw}&quot;</p>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <IngredientCombobox
                    options={options}
                    value={
                      row.matchedIngredientId
                        ? { id: row.matchedIngredientId, name: row.ingredientName }
                        : null
                    }
                    onChange={(option) =>
                      updateIngredientRow(row.key, {
                        matchedIngredientId: option.id,
                        ingredientName: option.name,
                      })
                    }
                    onCreated={(option) => onOptionsChange([...options, option])}
                  />
                  {!row.matchedIngredientId && (
                    <p className="mt-1 text-xs text-terracotta-text">
                      Not matched yet, pick or create one above.
                    </p>
                  )}
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
                  value={row.quantity ?? ""}
                  onChange={(e) =>
                    updateIngredientRow(row.key, {
                      quantity: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
                <select
                  className="rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  value={row.unit ?? ""}
                  onChange={(e) =>
                    updateIngredientRow(row.key, {
                      unit: (e.target.value || null) as Unit | null,
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
                placeholder="Note"
                className="mt-2 w-full rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                value={row.note ?? ""}
                onChange={(e) =>
                  updateIngredientRow(row.key, { note: e.target.value || null })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-green-deep">Steps</h2>
        <div className="flex flex-col gap-3">
          {stepRows.map((row, i) => (
            <div key={row.key} className="rounded-lg border border-border-soft bg-card p-3">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-ink-soft">{i + 1}.</span>
                <textarea
                  className="flex-1 rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
                  rows={2}
                  value={row.text}
                  onChange={(e) => updateStepRow(row.key, e.target.value)}
                />
                <button
                  type="button"
                  className="mt-1.5 shrink-0 text-xs text-red-600"
                  onClick={() => removeStepRow(row.key)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-terracotta-text">{error}</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={handleSave}
        className="rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save recipe"}
      </button>
    </div>
  );
}

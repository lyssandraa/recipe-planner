"use client";

import { useState, useTransition } from "react";
import type { IngredientCategory } from "@prisma/client";
import { guessCategory } from "@/lib/guessCategory";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/stockLevel";
import { addProductToPantry, createIngredientAndAddToPantry } from "../actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "@/app/components/toast-provider";

export default function AddToPantryButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [offeringCreate, setOfferingCreate] = useState(false);
  const [name, setName] = useState(productName);
  const [category, setCategory] = useState<IngredientCategory>(() =>
    guessCategory(productName)
  );
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(offeringCreate, () => setOfferingCreate(false));

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await addProductToPantry(productId);
      if (result.matched) {
        setMessage(`Added to pantry as "${result.ingredientName}".`);
        toast("Added to pantry");
      } else {
        setOfferingCreate(true);
      }
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createIngredientAndAddToPantry(productId, name, category);
      if (result.matched) {
        setMessage(`Created "${result.ingredientName}" and added it to your pantry.`);
        setOfferingCreate(false);
        toast("Added to pantry");
      }
    });
  }

  if (offeringCreate) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-3 shadow-sm">
        <p className="text-sm text-ink">
          Nothing in your ingredient catalog matches this product&apos;s name.
          Create one to add it to your pantry.
        </p>
        <input
          className="rounded-[12px] border border-border-soft px-2 py-1.5 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          Category
          <select
            className="flex-1 rounded border border-border-soft px-1.5 py-1 text-xs text-ink"
            value={category}
            onChange={(e) => setCategory(e.target.value as IngredientCategory)}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={handleCreate}
            className="w-full rounded-[12px] bg-green-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Adding…" : "Create and add to pantry"}
          </button>
          <button
            type="button"
            onClick={() => setOfferingCreate(false)}
            className="shrink-0 text-xs text-ink-soft"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-[12px] bg-green-deep px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add to pantry"}
      </button>
      {message && <p className="mt-2 text-sm text-ink-soft">{message}</p>}
    </div>
  );
}

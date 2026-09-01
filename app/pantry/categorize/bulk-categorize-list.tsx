"use client";

import { useState, useTransition } from "react";
import type { IngredientCategory } from "@prisma/client";
import { IconSparkles } from "@tabler/icons-react";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/stockLevel";
import EmptyState from "@/app/components/empty-state";
import { updateIngredientCategory } from "../actions";

type Item = { id: string; name: string; category: IngredientCategory };

export default function BulkCategorizeList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  function setCategory(id: string, category: IngredientCategory) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
    startTransition(() => {
      updateIngredientCategory(id, category);
    });
  }

  const remaining = items.filter((i) => i.category === "OTHER");

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<IconSparkles size={40} stroke={1.5} />}
        message="Nothing in Other right now, everything's sorted."
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-text-muted">{remaining.length} left to sort</p>
      <ul className="flex flex-col divide-y divide-border-soft rounded-lg border border-border-soft bg-card">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="text-sm text-sage-darker">{item.name}</span>
            <select
              className={`rounded border px-1.5 py-1 text-xs ${
                item.category === "OTHER"
                  ? "border-clay text-clay"
                  : "border-border-soft text-sage-darker"
              }`}
              value={item.category}
              onChange={(e) => setCategory(item.id, e.target.value as IngredientCategory)}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

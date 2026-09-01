"use client";

import { useMemo, useRef, useState } from "react";
import type { IngredientCategory } from "@prisma/client";
import { guessCategory } from "@/lib/guessCategory";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/stockLevel";
import { createIngredient } from "./actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

export type IngredientOption = {
  id: string;
  name: string;
  plural: string | null;
  isStaple: boolean;
};

export default function IngredientCombobox({
  options,
  value,
  onChange,
  onCreated,
}: {
  options: IngredientOption[];
  value: { id: string; name: string } | null;
  onChange: (option: IngredientOption) => void;
  onCreated: (option: IngredientOption) => void;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<IngredientCategory>("OTHER");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(open, () => setOpen(false));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? options.filter((o) => o.name.toLowerCase().includes(q))
      : options;
    return pool.slice(0, 8);
  }, [query, options]);

  const exactMatch = options.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase()
  );

  const guessedCategory = query.trim() ? guessCategory(query.trim()) : "OTHER";
  const effectiveCategory = categoryTouched ? category : guessedCategory;

  function handleBlur() {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createIngredient(name, effectiveCategory);
      onCreated(created);
      onChange(created);
      setQuery(created.name);
      setOpen(false);
      setCategoryTouched(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <input
        className="w-full rounded-md border border-border-soft px-2 py-1.5 text-sm"
        placeholder="Search ingredient…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border-soft bg-card shadow-md">
          {filtered.map((option) => (
            <button
              type="button"
              key={option.id}
              className="block w-full px-2 py-1.5 text-left text-sm hover:bg-page-bg"
              onMouseDown={() => {
                onChange(option);
                setQuery(option.name);
                setOpen(false);
              }}
            >
              {option.name}
              {option.isStaple && (
                <span className="ml-1 text-xs text-text-muted">(staple)</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && !query.trim() && (
            <div className="px-2 py-1.5 text-sm text-text-muted">
              Type to search…
            </div>
          )}
          {query.trim() && !exactMatch && (
            <div className="border-t border-border-soft p-2">
              <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-sm text-sage-deep hover:bg-page-bg disabled:opacity-50"
                disabled={creating}
                onMouseDown={handleCreate}
              >
                {creating ? "Creating…" : `+ Create "${query.trim()}"`}
              </button>
              <label className="mt-1 flex items-center gap-2 px-2 text-xs text-text-muted">
                Category
                <select
                  className="flex-1 rounded border border-border-soft px-1.5 py-1 text-xs text-sage-darker"
                  value={effectiveCategory}
                  onChange={(e) => {
                    setCategory(e.target.value as IngredientCategory);
                    setCategoryTouched(true);
                  }}
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

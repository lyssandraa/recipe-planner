"use client";

import { useMemo, useState, useTransition } from "react";
import type { StockLevel, IngredientCategory } from "@prisma/client";
import {
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  STOCK_LEVELS,
  STOCK_LEVEL_LABELS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_BORDER_CLASS,
  getStockLevelClasses,
} from "@/lib/stockLevel";
import { getCategoryEmoji } from "@/lib/categoryIcons";
import { guessCategory } from "@/lib/guessCategory";
import { getStaticStorageAdvice } from "@/lib/storageAdvice";
import { getIngredientEmoji } from "@/lib/ingredientIcons";
import StorageAdviceToggle from "@/app/components/storage-advice-toggle";
import EmptyState from "@/app/components/empty-state";
import { useToast } from "@/app/components/toast-provider";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import {
  setStockLevel,
  createPantryIngredient,
  updateIngredientCategory,
  setIngredientSatisfies,
  reorderIngredients,
} from "./actions";

export type PantryItemData = {
  id: string;
  name: string;
  category: IngredientCategory;
  isStaple: boolean;
  stockLevel: StockLevel | null;
  storageAdvice: string | null;
  hasCustomAdvice: boolean;
  // Other ingredients this one can stand in for, e.g. unsalted butter
  // satisfies butter. Distinct from a synonym, this is a real substitution.
  satisfiesIds: string[];
};

export default function PantryChecklist({ items: initial }: { items: PantryItemData[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createCategory, setCreateCategory] = useState<IngredientCategory | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, StockLevel | null>>(() =>
    Object.fromEntries(initial.map((i) => [i.id, i.stockLevel]))
  );
  const [satisfiesByItem, setSatisfiesByItem] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(initial.map((i) => [i.id, i.satisfiesIds]))
  );
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(editingCategoryId != null, () => setEditingCategoryId(null));
  useEscapeToClose(query.trim() !== "" && !creating, () => setQuery(""));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const trackedItems = filtered.filter((i) => !i.isStaple);
  const stapleItems = filtered.filter((i) => i.isStaple);

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: trackedItems.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  const exactMatch = items.some(
    (i) => i.name.toLowerCase() === query.trim().toLowerCase()
  );
  const guessedCategory = query.trim() ? guessCategory(query.trim()) : "OTHER";
  const effectiveCreateCategory = createCategory ?? guessedCategory;

  function toggle(item: PantryItemData, level: StockLevel) {
    setLevels((prev) => ({ ...prev, [item.id]: level }));
    startTransition(() => {
      setStockLevel(item.id, level);
    });
  }

  function changeCategory(item: PantryItemData, category: IngredientCategory) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, category } : i)));
    setEditingCategoryId(null);
    startTransition(() => {
      updateIngredientCategory(item.id, category);
    });
  }

  // Moves an item one place within the same rendered group (a category
  // section, or the staples list), swapping it with its neighbour. Only
  // offered while not searching, since a search shows a partial view of a
  // group and reordering that partial view would scramble the hidden rest.
  function moveItem(item: PantryItemData, group: PantryItemData[], direction: "up" | "down") {
    const index = group.findIndex((i) => i.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= group.length) return;
    const neighbour = group[targetIndex];

    const reordered = [...group];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const reorderedIds = reordered.map((i) => i.id);

    setItems((prev) => {
      const next = [...prev];
      const iA = next.findIndex((i) => i.id === item.id);
      const iB = next.findIndex((i) => i.id === neighbour.id);
      [next[iA], next[iB]] = [next[iB], next[iA]];
      return next;
    });
    startTransition(() => {
      reorderIngredients(reorderedIds);
    });
  }

  function toggleSatisfies(item: PantryItemData, targetId: string) {
    const current = satisfiesByItem[item.id] ?? [];
    const next = current.includes(targetId)
      ? current.filter((id) => id !== targetId)
      : [...current, targetId];
    setSatisfiesByItem((prev) => ({ ...prev, [item.id]: next }));
    startTransition(() => {
      setIngredientSatisfies(item.id, next);
    });
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    try {
      const ingredient = await createPantryIngredient(name, effectiveCreateCategory);
      setItems((prev) => [
        ...prev,
        {
          id: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          isStaple: ingredient.isStaple,
          stockLevel: null,
          storageAdvice: getStaticStorageAdvice(ingredient.name, ingredient.category),
          hasCustomAdvice: false,
          satisfiesIds: [],
        },
      ]);
      setLevels((prev) => ({ ...prev, [ingredient.id]: null }));
      setSatisfiesByItem((prev) => ({ ...prev, [ingredient.id]: [] }));
      setQuery("");
      setCreateCategory(null);
      toast(`Added "${ingredient.name}"`);
    } finally {
      setCreating(false);
    }
  }

  function renderRow(item: PantryItemData, group: PantryItemData[]) {
    const currentLevel = levels[item.id] ?? null;
    const editing = editingCategoryId === item.id;
    const emoji = getIngredientEmoji(item) || getCategoryEmoji(item.category);
    const canReorder = !query.trim() && group.length > 1;
    const index = group.findIndex((i) => i.id === item.id);
    return (
      <li key={item.id} className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {canReorder && (
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(item, group, "up")}
                  aria-label="Move up"
                  className="text-ink-soft disabled:opacity-30"
                >
                  <IconChevronUp size={13} stroke={2} />
                </button>
                <button
                  type="button"
                  disabled={index === group.length - 1}
                  onClick={() => moveItem(item, group, "down")}
                  aria-label="Move down"
                  className="-mt-1 text-ink-soft disabled:opacity-30"
                >
                  <IconChevronDown size={13} stroke={2} />
                </button>
              </div>
            )}
            <span className="shrink-0 text-sm">{emoji}</span>
            <button
              type="button"
              onClick={() => setEditingCategoryId(editing ? null : item.id)}
              className="flex items-center gap-1.5 text-sm text-ink"
            >
              {item.name}
              <IconPencil size={12} stroke={1.75} className="text-ink-soft" />
            </button>
            <StorageAdviceToggle
              ingredientId={item.id}
              advice={item.storageAdvice}
              hasCustom={item.hasCustomAdvice}
            />
          </div>
          <div className="flex shrink-0 gap-1">
            {STOCK_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                disabled={isPending}
                onClick={() => toggle(item, level)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-60 ${getStockLevelClasses(level, currentLevel === level)}`}
              >
                {STOCK_LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
        {editing && (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-cream-grey p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Edit ingredient</span>
              <button
                type="button"
                onClick={() => setEditingCategoryId(null)}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={14} stroke={2} />
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              Category
              <select
                className="flex-1 rounded border border-border-soft bg-card px-1.5 py-1 text-xs text-ink"
                value={item.category}
                disabled={isPending}
                onChange={(e) => changeCategory(item, e.target.value as IngredientCategory)}
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="mb-1 text-xs text-ink-soft">This can stand in for…</p>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {items
                  .filter((other) => other.id !== item.id)
                  .map((other) => {
                    const active = (satisfiesByItem[item.id] ?? []).includes(other.id);
                    return (
                      <button
                        key={other.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleSatisfies(item, other.id)}
                        className={`rounded-full px-2 py-1 text-[11px] disabled:opacity-60 ${
                          active
                            ? "bg-green-deep text-white"
                            : "border border-border-soft bg-card text-ink-soft"
                        }`}
                      >
                        {other.name}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </li>
    );
  }

  return (
    <div>
      <div className="relative mb-4">
        <div className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2.5 shadow-sm">
          <IconSearch size={16} stroke={1.75} className="shrink-0 text-ink-soft" />
          <input
            className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
            placeholder="Search or add an ingredient…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCreateCategory(null);
            }}
          />
        </div>
        {query.trim() && !exactMatch && (
          <div className="mt-2 rounded-2xl border-2 border-green-deep bg-card p-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="block flex-1 rounded px-1 py-1 text-left text-sm font-medium text-green-deep disabled:opacity-50"
              >
                {creating ? "Creating…" : `+ Create "${query.trim()}"`}
              </button>
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Cancel"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={14} stroke={2} />
              </button>
            </div>
            <label className="mt-1 flex items-center gap-2 px-1 text-xs text-ink-soft">
              Category
              <select
                className="flex-1 rounded border border-border-soft px-1.5 py-1 text-xs text-ink"
                value={effectiveCreateCategory}
                onChange={(e) => setCreateCategory(e.target.value as IngredientCategory)}
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

      <div className="flex flex-col gap-4">
        {groups.map((group, i) => (
          <section
            key={group.category}
            style={{ animationDelay: `${i * 70}ms` }}
            className="motion-safe:animate-fade-up-sm"
          >
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-green-deep uppercase">
              <span className="text-sm normal-case">{getCategoryEmoji(group.category)}</span>
              {CATEGORY_LABELS[group.category]}
              <span className="ml-auto text-xs font-normal text-ink-soft normal-case">
                {group.items.length}
              </span>
            </h2>
            <ul
              className={`flex flex-col divide-y divide-border-soft rounded-2xl border-b-[3px] bg-card ${CATEGORY_BORDER_CLASS[group.category]}`}
            >
              {group.items.map((item) => renderRow(item, group.items))}
            </ul>
          </section>
        ))}

        {groups.length === 0 && stapleItems.length === 0 && (
          <EmptyState
            emoji="🔍"
            message="No ingredients match."
            hint="Try a different search, or add one above."
          />
        )}

        {stapleItems.length > 0 && (
          <div className="rounded-2xl bg-cream-grey shadow-sm">
            <button
              type="button"
              onClick={() => setStaplesOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-4 py-3"
            >
              <span className="text-sm">🗄️</span>
              <span className="text-sm font-semibold text-cream-grey-text">
                Staples ({stapleItems.length})
              </span>
              <IconChevronDown
                size={16}
                stroke={2}
                className={`ml-auto shrink-0 text-cream-grey-text transition-transform ${
                  staplesOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {staplesOpen && (
              <ul className="flex flex-col divide-y divide-border-soft border-t border-border-soft">
                {stapleItems.map((item) => renderRow(item, stapleItems))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

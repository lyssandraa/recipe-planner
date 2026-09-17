"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  IconBook2,
  IconCheck,
  IconChevronDown,
  IconClockExclamation,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import EmptyState from "@/app/components/empty-state";
import { useToast } from "@/app/components/toast-provider";
import { SHOPPING_CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_BORDER_CLASS } from "@/lib/stockLevel";
import { getShoppingCategoryEmoji } from "@/lib/shoppingCategoryIcons";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import {
  syncShoppingList,
  addManualItem,
  toggleShoppingItemChecked,
  deleteShoppingItem,
  clearTickedItems,
  promoteLowStockItem,
  reorderShoppingItems,
  type ShoppingListItemData,
  type MightNeedSoonItem,
} from "./actions";
import ShoppingListRow from "./shopping-list-row";

type Recipe = { id: string; title: string; mealType: string };

function fadeStyle(index: number): CSSProperties {
  return { animationDelay: `${index * 60}ms` };
}

export default function ShoppingListBuilder({
  initialItems,
  initialMightNeedSoon,
  recipes,
}: {
  initialItems: ShoppingListItemData[];
  initialMightNeedSoon: MightNeedSoonItem[];
  recipes: Recipe[];
}) {
  const [items, setItems] = useState(initialItems);
  const [mightNeedSoon, setMightNeedSoon] = useState(initialMightNeedSoon);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipesOpen, setRecipesOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [clearing, setClearing] = useState(false);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [spendInput, setSpendInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(recipesOpen, () => setRecipesOpen(false));
  useEscapeToClose(clearing, () => setClearing(false));
  // Compares against the last selection actually synced, rather than a
  // one-shot "have we run yet" flag: React Strict Mode double-invokes
  // effects in development, which would flip a boolean flag on its first
  // (skipped) pass and then sync anyway on the second, wiping recipe rows
  // for a selection nothing has actually changed to yet.
  const lastSyncedKey = useRef("");

  useEffect(() => {
    const key = Array.from(selected).sort().join(",");
    if (key === lastSyncedKey.current) return;
    lastSyncedKey.current = key;

    startTransition(async () => {
      const result = await syncShoppingList(Array.from(selected));
      setItems(result);
    });
  }, [selected]);

  function toggleRecipe(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleChecked(item: ShoppingListItemData) {
    const nextChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: nextChecked } : i))
    );
    startTransition(() => {
      toggleShoppingItemChecked(item.id, nextChecked);
    });
  }

  function handleDelete(item: ShoppingListItemData) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      await deleteShoppingItem(item.id);
    });
    toast(`Removed "${item.name}"`);
  }

  // Moves an item one place within its category group, swapping it with
  // its neighbour there. Only offered on to-buy rows, reordering something
  // already ticked into the trolley isn't useful.
  function moveItem(
    item: ShoppingListItemData,
    group: ShoppingListItemData[],
    direction: "up" | "down"
  ) {
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
      reorderShoppingItems(reorderedIds);
    });
  }

  function handleAddManual() {
    const name = manualName.trim();
    if (!name || isPending) return;
    startTransition(async () => {
      const result = await addManualItem(name, manualQuantity || null);
      setItems(result);
      setManualName("");
      setManualQuantity("");
      toast(`Added "${name}"`);
    });
  }

  const toBuyItems = items.filter((i) => !i.checked);
  const tickedItems = items.filter((i) => i.checked);

  const itemPriceSum = tickedItems.reduce((sum, item) => {
    const val = Number((itemPrices[item.id] ?? "").trim());
    return Number.isFinite(val) && itemPrices[item.id]?.trim() ? sum + val : sum;
  }, 0);
  const anyItemPriced = tickedItems.some((item) => (itemPrices[item.id] ?? "").trim());

  function handleConfirmClear() {
    const parsedItemPrices: Record<string, number | null> = {};
    for (const item of tickedItems) {
      const raw = (itemPrices[item.id] ?? "").trim();
      const val = raw ? Number(raw) : null;
      parsedItemPrices[item.id] = val != null && Number.isFinite(val) ? val : null;
    }

    const overrideTrimmed = spendInput.trim();
    const overrideVal = overrideTrimmed ? Number(overrideTrimmed) : null;
    const totalSpent = overrideTrimmed
      ? overrideVal != null && Number.isFinite(overrideVal)
        ? overrideVal
        : null
      : anyItemPriced
        ? itemPriceSum
        : null;

    startTransition(async () => {
      const result = await clearTickedItems(parsedItemPrices, totalSpent);
      setItems(result);
      setClearing(false);
      setSpendInput("");
      setItemPrices({});
      toast("Cleared, shop logged");
    });
  }

  function handlePromote(item: MightNeedSoonItem) {
    setMightNeedSoon((prev) => prev.filter((i) => i.ingredientId !== item.ingredientId));
    startTransition(async () => {
      const result = await promoteLowStockItem(item.ingredientId);
      setItems(result);
      toast(`Added "${item.name}"`);
    });
  }

  const groups = SHOPPING_CATEGORY_ORDER.map((category) => ({
    category,
    items: toBuyItems.filter((i) => (i.category ?? "OTHER") === category),
  })).filter((g) => g.items.length > 0);

  let cardIndex = 0;
  const addCardDelay = cardIndex++;

  return (
    <div className="flex flex-col gap-3">
      {/* Add item */}
      <div
        className="motion-safe:animate-fade-up-sm flex items-center gap-2 rounded-2xl bg-card p-2 shadow-sm"
        style={fadeStyle(addCardDelay)}
      >
        <input
          className="min-w-0 flex-1 border-none bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
          placeholder="Add an item…"
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddManual();
          }}
        />
        <input
          className="w-16 shrink-0 rounded-[12px] bg-cream-grey px-2 py-2 text-center text-sm text-ink placeholder:text-ink-soft focus:outline-none"
          placeholder="Qty"
          value={manualQuantity}
          onChange={(e) => setManualQuantity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddManual();
          }}
        />
        <button
          type="button"
          disabled={!manualName.trim() || isPending}
          onClick={handleAddManual}
          aria-label="Add item"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber text-amber-text disabled:opacity-50"
        >
          <IconPlus size={18} stroke={2} />
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          emoji="🛒"
          message="Nothing on your list yet."
          hint="Items appear here when you mark something as out in the pantry, or pick a recipe below."
        />
      ) : (
        groups.map((group) => {
          const index = cardIndex++;
          return (
            <div
              key={group.category}
              style={fadeStyle(index)}
              className={`motion-safe:animate-fade-up-sm rounded-2xl border-b-[3px] bg-card p-4 shadow-sm ${CATEGORY_BORDER_CLASS[group.category]}`}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-sm">{getShoppingCategoryEmoji(group.category)}</span>
                <h2 className="text-[11px] font-bold tracking-wide text-green-deep uppercase">
                  {CATEGORY_LABELS[group.category]}
                </h2>
                <span className="ml-auto text-xs text-ink-soft">{group.items.length}</span>
              </div>
              <ul className="flex flex-col divide-y divide-border-soft">
                {group.items.map((item, i) => (
                  <ShoppingListRow
                    key={item.id}
                    item={item}
                    onToggleChecked={() => toggleChecked(item)}
                    onOverrideChange={(value) =>
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, overrideQuantityText: value } : i
                        )
                      )
                    }
                    onDelete={() => handleDelete(item)}
                    canMoveUp={i > 0}
                    canMoveDown={i < group.items.length - 1}
                    onMoveUp={() => moveItem(item, group.items, "up")}
                    onMoveDown={() => moveItem(item, group.items, "down")}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}

      {mightNeedSoon.length > 0 && (
        <div
          className="motion-safe:animate-fade-up-sm rounded-2xl bg-cream-grey p-4 shadow-sm"
          style={fadeStyle(cardIndex++)}
        >
          <div className="mb-2 flex items-center gap-2">
            <IconClockExclamation size={16} stroke={1.75} className="text-cream-grey-text" />
            <h2 className="text-sm font-semibold text-cream-grey-text">Might need soon</h2>
          </div>
          <ul className="flex flex-col divide-y divide-border-soft">
            {mightNeedSoon.map((item) => (
              <li key={item.ingredientId} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm text-cream-grey-text">{item.name}</span>
                <button
                  type="button"
                  onClick={() => handlePromote(item)}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-green-deep shadow-sm"
                >
                  <IconPlus size={12} stroke={2} />
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="motion-safe:animate-fade-up-sm rounded-2xl bg-card shadow-sm"
        style={fadeStyle(cardIndex++)}
      >
        <button
          type="button"
          onClick={() => setRecipesOpen((o) => !o)}
          className="flex w-full items-center gap-2 p-4"
        >
          <IconBook2 size={18} stroke={1.75} className="text-lime" />
          <span className="text-sm font-semibold text-ink">Add from a recipe</span>
          {isPending && <span className="text-xs text-ink-soft">Updating…</span>}
          {!isPending && selected.size > 0 && (
            <span className="text-xs text-ink-soft">{selected.size} selected</span>
          )}
          <IconChevronDown
            size={16}
            stroke={2}
            className={`ml-auto shrink-0 text-ink-soft transition-transform ${
              recipesOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {recipesOpen && (
          <ul className="flex flex-col divide-y divide-border-soft border-t border-border-soft">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <label className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.has(recipe.id)}
                    onChange={() => toggleRecipe(recipe.id)}
                  />
                  <span className="text-ink">{recipe.title}</span>
                  <span className="ml-auto text-xs text-ink-soft">{recipe.mealType}</span>
                </label>
              </li>
            ))}
            {recipes.length === 0 && (
              <li className="px-4 py-4 text-sm text-ink-soft">No recipes yet.</li>
            )}
          </ul>
        )}
      </div>

      {tickedItems.length > 0 && (
        <div className="motion-safe:animate-fade-up-sm" style={fadeStyle(cardIndex++)}>
          <div className="rounded-2xl bg-card p-4 opacity-[0.7] shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">In the trolley</h2>
              <button
                type="button"
                onClick={() => setClearing(true)}
                className="text-xs text-ink-soft underline"
              >
                Clear ({tickedItems.length})
              </button>
            </div>
            <ul className="flex flex-col divide-y divide-border-soft">
              {tickedItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleChecked(item)}
                    aria-label="Mark not bought"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-green-deep bg-green-deep"
                  >
                    <IconCheck size={13} stroke={3} className="text-white" />
                  </button>
                  <span className="flex-1 text-sm text-ink-soft line-through">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    aria-label="Delete"
                    className="shrink-0 text-ink-soft"
                  >
                    <IconTrash size={15} stroke={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {clearing && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4">
          <div className="flex max-h-[85vh] w-full max-w-[380px] flex-col rounded-2xl bg-card shadow-lg">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-sm font-semibold text-ink">
                Log this shop ({tickedItems.length} item{tickedItems.length === 1 ? "" : "s"})
              </h2>
              <button
                type="button"
                onClick={() => setClearing(false)}
                aria-label="Cancel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4">
              <p className="mb-1.5 text-xs text-ink-soft">
                Price what you can, skip the rest, it's all optional.
              </p>
              <ul className="flex flex-col divide-y divide-border-soft">
                {tickedItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
                    <label className="flex w-24 shrink-0 items-center gap-1 rounded-[10px] border border-border-soft px-2 py-1">
                      <span className="text-xs text-ink-soft">£</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={itemPrices[item.id] ?? ""}
                        onChange={(e) =>
                          setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="w-full border-none bg-transparent text-sm text-ink focus:outline-none"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 pt-3">
              <label className="flex items-center gap-2 rounded-[12px] border border-border-soft px-3 py-2.5">
                <span className="text-sm text-ink-soft">£</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder={anyItemPriced ? itemPriceSum.toFixed(2) : "Total spent (optional)"}
                  value={spendInput}
                  onChange={(e) => setSpendInput(e.target.value)}
                  className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                />
              </label>
              <p className="mt-1.5 text-xs text-ink-soft">
                {anyItemPriced
                  ? `Defaults to the ${itemPriceSum.toFixed(2)} above, type here to override (tax, a discount, rounding).`
                  : "Leave blank to skip, the trip still gets logged for the tracker."}
              </p>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmClear}
                className="mt-3 w-full rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Clearing…" : "Clear list"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

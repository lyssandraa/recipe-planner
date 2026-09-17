"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";

export type EditableTripItem = {
  key: string;
  name: string;
  quantityText: string;
  price: string;
};

let rowIdCounter = 0;
export function nextTripItemKey(): string {
  rowIdCounter += 1;
  return `trip-item-${rowIdCounter}`;
}

export function emptyTripItem(): EditableTripItem {
  return { key: nextTripItemKey(), name: "", quantityText: "", price: "" };
}

// Shared by manual "Add expense" entry and the receipt-scan review screen,
// both land on the same free-form list of name/quantity/price rows before
// anything is saved.
export default function TripItemEditor({
  items,
  onChange,
}: {
  items: EditableTripItem[];
  onChange: (items: EditableTripItem[]) => void;
}) {
  function updateItem(key: string, patch: Partial<EditableTripItem>) {
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    onChange(items.filter((i) => i.key !== key));
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5">
          <input
            placeholder="Item"
            value={item.name}
            onChange={(e) => updateItem(item.key, { name: e.target.value })}
            className="min-w-0 flex-1 rounded-[10px] border border-border-soft px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Qty"
            value={item.quantityText}
            onChange={(e) => updateItem(item.key, { quantityText: e.target.value })}
            className="w-14 shrink-0 rounded-[10px] border border-border-soft px-1.5 py-1.5 text-sm"
          />
          <label className="flex w-20 shrink-0 items-center gap-1 rounded-[10px] border border-border-soft px-1.5 py-1.5">
            <span className="text-xs text-ink-soft">£</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={item.price}
              onChange={(e) => updateItem(item.key, { price: e.target.value })}
              className="w-full border-none bg-transparent text-sm text-ink focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => removeItem(item.key)}
            aria-label="Remove"
            className="shrink-0 text-ink-soft"
          >
            <IconTrash size={15} stroke={1.75} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, emptyTripItem()])}
        className="flex items-center gap-1.5 self-start text-xs font-medium text-green-deep"
      >
        <IconPlus size={14} stroke={2} />
        Add item
      </button>
    </div>
  );
}

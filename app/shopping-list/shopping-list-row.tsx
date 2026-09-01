"use client";

import { useState, useTransition } from "react";
import { IconBasket, IconCheck, IconPencil, IconToolsKitchen2 } from "@tabler/icons-react";
import { setItemQuantityOverride, type ShoppingListItemData } from "./actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

function OriginIcon({ origin }: { origin: ShoppingListItemData["origin"] }) {
  const className = "shrink-0 text-text-muted";
  switch (origin) {
    case "RECIPE":
      return <IconToolsKitchen2 size={14} stroke={1.75} className={className} />;
    case "LOW_STOCK":
      return <IconBasket size={14} stroke={1.75} className={className} />;
    case "MANUAL":
      return <IconPencil size={14} stroke={1.75} className={className} />;
  }
}

export default function ShoppingListRow({
  item,
  onToggleChecked,
  onOverrideChange,
}: {
  item: ShoppingListItemData;
  onToggleChecked: () => void;
  onOverrideChange: (value: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  useEscapeToClose(editing, () => setEditing(false));

  const displayQty = item.overrideQuantityText ?? item.quantityText;
  const showRecipeNote =
    item.overrideQuantityText != null &&
    item.origin === "RECIPE" &&
    item.quantityText != null;

  function openEditor() {
    setDraft(displayQty ?? "");
    setEditing(true);
  }

  function handleSave() {
    const value = draft.trim() || null;
    onOverrideChange(value);
    startTransition(() => {
      setItemQuantityOverride(item.id, value);
    });
    setEditing(false);
  }

  function handleClear() {
    onOverrideChange(null);
    startTransition(() => {
      setItemQuantityOverride(item.id, null);
    });
    setEditing(false);
  }

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleChecked}
          aria-label={item.checked ? "Mark not bought" : "Mark bought"}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
            item.checked ? "border-sage-deep bg-sage-deep" : "border-border-soft bg-white"
          }`}
        >
          {item.checked && <IconCheck size={13} stroke={3} className="text-white" />}
        </button>

        <div className="min-w-0 flex-1">
          <span className="block text-sm text-sage-darker">{item.name}</span>
          {showRecipeNote && (
            <span className="block text-[11px] text-text-muted">
              recipe needs {item.quantityText}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={openEditor}
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            showRecipeNote ? "bg-peridot-tint text-olive-text" : "bg-sage-light/30 text-sage-darker"
          }`}
        >
          {displayQty ?? "add qty"}
        </button>

        <OriginIcon origin={item.origin} />
      </div>

      {editing && (
        <div className="mt-2 ml-8 flex items-center gap-2">
          <input
            autoFocus
            className="w-28 rounded-md border border-border-soft px-2 py-1 text-xs"
            placeholder="e.g. 400g"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="rounded-md bg-sage-deep px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
          {item.overrideQuantityText != null && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleClear}
              className="text-xs text-text-muted underline"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-text-muted"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

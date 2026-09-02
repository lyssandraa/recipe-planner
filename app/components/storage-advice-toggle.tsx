"use client";

import { useState, useTransition } from "react";
import { IconInfoCircle, IconX } from "@tabler/icons-react";
import { updateIngredientStorageAdvice } from "@/app/pantry/actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "./toast-provider";

export default function StorageAdviceToggle({
  ingredientId,
  advice: initialAdvice,
  hasCustom: initialHasCustom,
}: {
  ingredientId: string;
  // Resolved value: the custom override if set, otherwise the static
  // lookup's suggestion, otherwise null.
  advice: string | null;
  hasCustom: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [advice, setAdvice] = useState(initialAdvice);
  const [hasCustom, setHasCustom] = useState(initialHasCustom);
  const [draft, setDraft] = useState(initialAdvice ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(open, () => {
    setEditing(false);
    setOpen(false);
  });

  function handleSave() {
    const value = draft.trim() || null;
    setAdvice(value);
    setHasCustom(value != null);
    startTransition(() => {
      updateIngredientStorageAdvice(ingredientId, value);
    });
    setEditing(false);
    toast("Storage advice saved");
  }

  return (
    <span className="inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={advice ? "text-lime" : "text-ink-soft/50"}
        aria-label="Storage advice"
      >
        <IconInfoCircle size={14} stroke={1.75} />
      </button>

      {open && (
        <div className="mt-1 rounded-md bg-cream-grey p-2 text-xs">
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setOpen(false);
              }}
              aria-label="Close"
              className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft"
            >
              <IconX size={12} stroke={2} />
            </button>
          </div>
          {editing ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                autoFocus
                className="rounded border border-border-soft bg-card px-2 py-1 text-xs text-ink"
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSave}
                  className="rounded bg-green-deep px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-ink-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-ink-soft">{advice ?? "No storage advice yet."}</p>
              <button
                type="button"
                onClick={() => {
                  setDraft(advice ?? "");
                  setEditing(true);
                }}
                className="mt-1 text-green-deep"
              >
                {advice ? (hasCustom ? "Edit" : "Override") : "+ Add advice"}
              </button>
            </>
          )}
        </div>
      )}
    </span>
  );
}

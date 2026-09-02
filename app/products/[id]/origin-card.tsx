"use client";

import { useState, useTransition } from "react";
import { IconExternalLink, IconPencil, IconX } from "@tabler/icons-react";
import { resolveOrigin, resolveOverride } from "@/lib/countries";
import { setOriginOverride } from "../actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "@/app/components/toast-provider";
import DetailCard from "@/app/components/detail-card";

type Row = { label: string; caption: string; flag: string | null; otherCount: number };

export default function OriginCard({
  productId,
  barcode,
  ingredientOrigin,
  manufacturingPlace,
  soldIn,
  originOverride: initialOverride,
  className,
  style,
}: {
  productId: string;
  barcode: string;
  ingredientOrigin: string | null;
  manufacturingPlace: string | null;
  soldIn: string | null;
  originOverride: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [override, setOverride] = useState(initialOverride);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialOverride ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(editing, () => setEditing(false));

  function handleSave() {
    const value = draft.trim() || null;
    setOverride(value);
    startTransition(() => {
      setOriginOverride(productId, value);
    });
    setEditing(false);
    toast(value ? "Origin corrected" : "Correction cleared");
  }

  function handleClear() {
    setOverride(null);
    setDraft("");
    startTransition(() => {
      setOriginOverride(productId, null);
    });
    setEditing(false);
    toast("Correction cleared");
  }

  const overrideDisplay = resolveOverride(override);
  const ingredientDisplay = resolveOrigin(ingredientOrigin);
  const manufacturingDisplay = resolveOrigin(manufacturingPlace);
  const soldInDisplay = resolveOrigin(soldIn);

  const rows: Row[] = [];
  if (overrideDisplay) {
    rows.push({
      label: overrideDisplay.label,
      caption: "Your correction",
      flag: overrideDisplay.flag,
      otherCount: 0,
    });
  } else {
    if (ingredientDisplay) {
      rows.push({
        label: ingredientDisplay.label,
        caption: "Where the ingredients come from",
        flag: ingredientDisplay.flag,
        otherCount: ingredientDisplay.otherCount,
      });
    }
    const sameAsIngredient =
      ingredientDisplay &&
      manufacturingDisplay &&
      manufacturingDisplay.label.toLowerCase() === ingredientDisplay.label.toLowerCase();
    if (manufacturingDisplay && !sameAsIngredient) {
      rows.push({
        label: manufacturingDisplay.label,
        caption: "Where it was made or packed",
        flag: manufacturingDisplay.flag,
        otherCount: manufacturingDisplay.otherCount,
      });
    }
    if (rows.length === 0 && soldInDisplay) {
      rows.push({
        label: soldInDisplay.label,
        caption: "Sold here, not necessarily where it's from",
        flag: soldInDisplay.flag,
        otherCount: soldInDisplay.otherCount,
      });
    }
  }

  return (
    <DetailCard
      emoji="🌍"
      title="Origin"
      borderClassName="border-pink-tint"
      meta={
        <button
          type="button"
          onClick={() => {
            setDraft(override ?? "");
            setEditing((e) => !e);
          }}
          aria-label="Correct origin"
          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
        >
          <IconPencil size={14} stroke={1.75} />
        </button>
      }
      className={className}
      style={style}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Origin data isn&apos;t available for this product.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-soft">
          {rows.map((row, i) => (
            <li key={i} className={`flex items-start gap-2 ${i === 0 ? "pb-2.5" : "py-2.5"}`}>
              {row.flag && <span className="shrink-0 text-lg leading-none">{row.flag}</span>}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {row.label}
                  {row.otherCount > 0 && (
                    <span className="ml-1 font-normal text-ink-soft">+{row.otherCount} more</span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">{row.caption}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-cream-grey p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-soft">Correct the origin</span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
            >
              <IconX size={14} stroke={2} />
            </button>
          </div>
          <input
            autoFocus
            className="rounded-md border border-border-soft bg-card px-2 py-1.5 text-sm text-ink"
            placeholder="e.g. United States, packed in Germany"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="rounded-md bg-green-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            {override != null && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleClear}
                className="text-xs text-ink-soft underline"
              >
                Clear correction
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <a
        href={`https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1 text-xs text-ink-soft underline"
      >
        <IconExternalLink size={12} stroke={1.75} className="shrink-0" />
        This data is crowdsourced on Open Food Facts and can be corrected there
      </a>
    </DetailCard>
  );
}

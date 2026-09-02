"use client";

import { useState, useTransition } from "react";
import { saveIngredientInfo } from "../actions";
import { formatPercentage } from "@/lib/productIngredients";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "@/app/components/toast-provider";

type Info = { functionLabel: string | null; plainEnglish: string | null } | null;

export default function IngredientInfoRow({
  position,
  rawText,
  percentage,
  eNumber,
  // The category header this line was parsed out from on THIS product's
  // label, e.g. "Sweetener" out of "Sweeteners (Sorbitol, Aspartame)".
  // Distinct from info.functionLabel below, which is a user-authored
  // plain-English explanation attached to the canonical ingredient itself.
  parsedFunctionLabel,
  ingredientId,
  ingredientName,
  info,
}: {
  position: number;
  rawText: string;
  percentage: number | null;
  eNumber: string | null;
  parsedFunctionLabel: string | null;
  ingredientId: string | null;
  ingredientName: string | null;
  info: Info;
}) {
  const [currentInfo, setCurrentInfo] = useState<Info>(info);
  const [editing, setEditing] = useState(false);
  const [functionLabel, setFunctionLabel] = useState(info?.functionLabel ?? "");
  const [plainEnglish, setPlainEnglish] = useState(info?.plainEnglish ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(editing, () => setEditing(false));

  // A bare category header with nothing declared in brackets after it, e.g.
  // a plain "Thickener" on the label. Shown as a function, not a numbered
  // ingredient, since there's no actual ingredient name here.
  const isFunctionOnly = parsedFunctionLabel != null && rawText === parsedFunctionLabel;

  if (isFunctionOnly) {
    return (
      <li className="px-3 py-2">
        <span className="rounded-full bg-cream-grey px-2 py-0.5 text-xs italic text-cream-grey-text">
          {rawText} (unspecified)
        </span>
      </li>
    );
  }

  function handleSave() {
    startTransition(async () => {
      await saveIngredientInfo(ingredientId!, {
        functionLabel: functionLabel.trim() || null,
        plainEnglish: plainEnglish.trim() || null,
      });
      setCurrentInfo({
        functionLabel: functionLabel.trim() || null,
        plainEnglish: plainEnglish.trim() || null,
      });
      setEditing(false);
      toast("Explanation saved");
    });
  }

  const hasInfo = !!(currentInfo?.plainEnglish || currentInfo?.functionLabel);

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="w-5 shrink-0 text-xs text-ink-soft">{position}.</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${ingredientId ? "bg-lime" : "bg-border-soft"}`}
            />
            <button
              type="button"
              disabled={!ingredientId}
              onClick={() => ingredientId && setEditing((e) => !e)}
              className="text-left text-sm font-medium text-ink disabled:cursor-default"
            >
              {rawText}
            </button>
            {percentage != null && (
              <span className="rounded-full bg-amber-tint px-1.5 py-0.5 text-[10px] font-medium text-amber-text">
                {formatPercentage(percentage)}%
              </span>
            )}
            {eNumber && (
              <span className="rounded-full bg-amber-tint px-1.5 py-0.5 text-[10px] font-medium text-amber-text">
                {eNumber}
              </span>
            )}
            {parsedFunctionLabel && (
              <span className="rounded-full bg-cream-grey px-1.5 py-0.5 text-[10px] text-cream-grey-text">
                {parsedFunctionLabel}
              </span>
            )}
          </div>

          {!ingredientId && (
            <p className="mt-1 text-xs text-ink-soft">Not matched to an ingredient yet.</p>
          )}

          {ingredientId && !editing && hasInfo && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 block text-left"
            >
              {currentInfo!.functionLabel && (
                <span className="mr-1.5 rounded-full bg-cream-grey px-2 py-0.5 text-xs text-cream-grey-text">
                  {currentInfo!.functionLabel}
                </span>
              )}
              {currentInfo!.plainEnglish && (
                <span className="text-xs text-ink-soft">{currentInfo!.plainEnglish}</span>
              )}
            </button>
          )}

          {ingredientId && !editing && !hasInfo && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 text-xs text-green-deep"
            >
              + Add explanation for &quot;{ingredientName}&quot;
            </button>
          )}

          {editing && (
            <div className="mt-2 flex flex-col gap-2 rounded-lg bg-cream-grey p-2.5">
              <input
                className="rounded-[12px] border border-border-soft bg-card px-2 py-1.5 text-sm"
                placeholder="Function, e.g. thickener"
                value={functionLabel}
                onChange={(e) => setFunctionLabel(e.target.value)}
              />
              <textarea
                className="rounded-[12px] border border-border-soft bg-card px-2 py-1.5 text-sm"
                rows={2}
                placeholder="Plain-English explanation"
                value={plainEnglish}
                onChange={(e) => setPlainEnglish(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSave}
                  className="rounded-[12px] bg-green-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFunctionLabel(currentInfo?.functionLabel ?? "");
                    setPlainEnglish(currentInfo?.plainEnglish ?? "");
                    setEditing(false);
                  }}
                  className="text-xs text-ink-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

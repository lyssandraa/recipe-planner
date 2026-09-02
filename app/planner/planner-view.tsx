"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EffortLabel } from "@/lib/effort";
import { getEffortPillClasses } from "@/lib/effort";
import { addDays, formatWeekStartParam, parseWeekStartParam } from "@/lib/week";
import { useToast } from "@/app/components/toast-provider";
import {
  IconChevronLeft,
  IconChevronRight,
  IconFlame,
  IconPin,
  IconPinFilled,
  IconRefresh,
  IconShoppingBag,
  IconSwitchHorizontal,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {
  generatePlan,
  markSlotCooked,
  regenerateSlot,
  sendWeekToShoppingList,
  setSlotRecipe,
  togglePin,
} from "./actions";

export type PlannerSlotData = {
  id: string;
  dayIndex: number;
  dateLabel: string;
  recipeId: string | null;
  recipeTitle: string | null;
  emoji: string;
  colorClass: string;
  effort: EffortLabel | null;
  timeLine: string | null;
  batchFriendly: boolean;
  cuisines: string[];
  pinned: boolean;
  isLeftover: boolean;
  leftoverOfTitle: string | null;
  cookedAt: string | null;
  missingCount: number | null;
};

export default function PlannerView({
  mealPlanId,
  weekStartParam,
  weekRangeLabel,
  lowEffortTarget: initialLowTarget,
  batchTarget: initialBatchTarget,
  slots,
  dinnerOptions,
}: {
  mealPlanId: string;
  weekStartParam: string;
  weekRangeLabel: string;
  lowEffortTarget: number;
  batchTarget: number;
  slots: PlannerSlotData[];
  dinnerOptions: { id: string; title: string }[];
}) {
  const [lowEffortTarget, setLowEffortTarget] = useState(initialLowTarget);
  const [batchTarget, setBatchTarget] = useState(initialBatchTarget);
  const [swapSlotId, setSwapSlotId] = useState<string | null>(null);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const weekStart = parseWeekStartParam(weekStartParam);
  const prevWeek = formatWeekStartParam(addDays(weekStart, -7));
  const nextWeek = formatWeekStartParam(addDays(weekStart, 7));

  function handleGenerate() {
    startTransition(async () => {
      await generatePlan(mealPlanId, { lowEffortTarget, batchTarget });
      toast("Week planned");
      router.refresh();
    });
  }

  function handleRegenerate(slotId: string) {
    setPendingSlotId(slotId);
    startTransition(async () => {
      const result = await regenerateSlot(slotId);
      setPendingSlotId(null);
      if (!result.found) toast("Nothing else available for this slot");
      router.refresh();
    });
  }

  function handleTogglePin(slotId: string, pinned: boolean) {
    startTransition(async () => {
      await togglePin(slotId, pinned);
      router.refresh();
    });
  }

  function handleSwap(slotId: string, recipeId: string) {
    startTransition(async () => {
      await setSlotRecipe(slotId, recipeId || null);
      setSwapSlotId(null);
      router.refresh();
    });
  }

  function handleClear(slotId: string) {
    startTransition(async () => {
      await setSlotRecipe(slotId, null);
      toast("Cleared");
      router.refresh();
    });
  }

  function handleCooked(slotId: string) {
    startTransition(async () => {
      await markSlotCooked(slotId);
      toast("Logged, pantry updated");
      router.refresh();
    });
  }

  function handleSendToShoppingList() {
    startTransition(async () => {
      const added = await sendWeekToShoppingList(mealPlanId);
      toast(added > 0 ? `${added} item${added === 1 ? "" : "s"} added` : "Nothing missing this week");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/planner?week=${prevWeek}`}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-soft shadow-sm"
        >
          <IconChevronLeft size={16} stroke={2} />
        </Link>
        <span className="text-sm font-semibold text-ink">{weekRangeLabel}</span>
        <Link
          href={`/planner?week=${nextWeek}`}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-soft shadow-sm"
        >
          <IconChevronRight size={16} stroke={2} />
        </Link>
      </div>

      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
            Low-effort target
            <input
              type="number"
              min={0}
              max={7}
              value={lowEffortTarget}
              onChange={(e) => setLowEffortTarget(Number(e.target.value))}
              className="rounded-md border border-border-soft px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
            Batch target
            <input
              type="number"
              min={0}
              max={3}
              value={batchTarget}
              onChange={(e) => setBatchTarget(Number(e.target.value))}
              className="rounded-md border border-border-soft px-2 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="mt-3 w-full rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending && !pendingSlotId ? "Planning…" : "Generate"}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-ink-soft">
          Fills empty slots only. Pinned days are left alone.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {slots.map((slot) => (
          <PlannerSlotCard
            key={slot.id}
            slot={slot}
            dinnerOptions={dinnerOptions}
            isPending={isPending && pendingSlotId === slot.id}
            swapping={swapSlotId === slot.id}
            onOpenSwap={() => setSwapSlotId(slot.id)}
            onCloseSwap={() => setSwapSlotId(null)}
            onRegenerate={() => handleRegenerate(slot.id)}
            onTogglePin={() => handleTogglePin(slot.id, !slot.pinned)}
            onSwap={(recipeId) => handleSwap(slot.id, recipeId)}
            onCooked={() => handleCooked(slot.id)}
            onClear={() => handleClear(slot.id)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleSendToShoppingList}
        className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-green-deep px-4 py-3 text-sm font-medium text-green-deep disabled:opacity-50"
      >
        <IconShoppingBag size={18} stroke={1.75} />
        Send missing ingredients to shopping list
      </button>
    </div>
  );
}

function PlannerSlotCard({
  slot,
  dinnerOptions,
  isPending,
  swapping,
  onOpenSwap,
  onCloseSwap,
  onRegenerate,
  onTogglePin,
  onSwap,
  onCooked,
  onClear,
}: {
  slot: PlannerSlotData;
  dinnerOptions: { id: string; title: string }[];
  isPending: boolean;
  swapping: boolean;
  onOpenSwap: () => void;
  onCloseSwap: () => void;
  onRegenerate: () => void;
  onTogglePin: () => void;
  onSwap: (recipeId: string) => void;
  onCooked: () => void;
  onClear: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border-b-[3px] border-lime bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[11px] font-bold tracking-wide text-green-deep uppercase">
          {slot.dateLabel}
        </span>
        {slot.batchFriendly && !slot.isLeftover && (
          <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[10px] font-medium text-amber-text">
            batch
          </span>
        )}
      </div>

      {slot.isLeftover ? (
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream-grey text-2xl">
            🍱
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Leftovers</p>
            <p className="text-xs text-ink-soft">
              {slot.leftoverOfTitle ? `From ${slot.leftoverOfTitle}` : "From an earlier dinner"}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSwap}
            aria-label="Swap"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft"
          >
            <IconSwitchHorizontal size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={isPending}
            aria-label="Remove"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft"
          >
            <IconTrash size={16} stroke={1.75} />
          </button>
        </div>
      ) : slot.recipeId ? (
        <>
          <div className="flex items-center gap-3 p-4 pb-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${slot.colorClass}`}
            >
              {slot.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/recipes/${slot.recipeId}`} className="block truncate text-sm font-medium text-ink">
                {slot.recipeTitle}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {slot.effort && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(slot.effort)}`}>
                    {slot.effort}
                  </span>
                )}
                {slot.timeLine && <span className="text-xs text-ink-soft">{slot.timeLine}</span>}
              </div>
              {slot.missingCount != null && (
                <p className={`mt-1 text-xs ${slot.missingCount === 0 ? "text-green-deep" : "text-terracotta-text"}`}>
                  {slot.missingCount === 0 ? "Ready to cook" : `Missing ${slot.missingCount} ingredient${slot.missingCount === 1 ? "" : "s"}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 border-t border-border-soft px-2 py-1.5">
            <button
              type="button"
              onClick={onTogglePin}
              disabled={isPending}
              aria-label={slot.pinned ? "Unpin" : "Pin"}
              className={`flex h-8 w-8 items-center justify-center rounded-full ${slot.pinned ? "text-amber-text" : "text-ink-soft"}`}
            >
              {slot.pinned ? <IconPinFilled size={16} stroke={1.75} /> : <IconPin size={16} stroke={1.75} />}
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isPending || slot.pinned}
              aria-label="Veto and try another"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft disabled:opacity-30"
            >
              <IconRefresh size={16} stroke={1.75} className={isPending ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onOpenSwap}
              disabled={isPending}
              aria-label="Swap"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft"
            >
              <IconSwitchHorizontal size={16} stroke={1.75} />
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isPending || !!slot.cookedAt}
              aria-label="Remove"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft disabled:opacity-30"
            >
              <IconTrash size={16} stroke={1.75} />
            </button>
            <button
              type="button"
              disabled={isPending || !!slot.cookedAt}
              onClick={onCooked}
              className="ml-auto flex items-center gap-1.5 rounded-full border border-border-soft px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
            >
              <IconFlame size={14} stroke={1.75} />
              {slot.cookedAt ? "Cooked" : "Cooked it"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-ink-soft">No dinner planned</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenSwap}
              className="rounded-full border border-border-soft px-3 py-1.5 text-xs font-medium text-ink"
            >
              Pick
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onRegenerate}
              className="rounded-full bg-green-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Filling…" : "Fill"}
            </button>
          </div>
        </div>
      )}

      {swapping && (
        <div className="flex items-center gap-2 border-t border-border-soft bg-cream-grey p-3">
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => e.target.value && onSwap(e.target.value)}
            className="flex-1 rounded-md border border-border-soft bg-card px-2 py-1.5 text-sm text-ink"
          >
            <option value="" disabled>
              Choose a dinner…
            </option>
            {dinnerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCloseSwap}
            aria-label="Cancel"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft"
          >
            <IconX size={16} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { IconDice5 } from "@tabler/icons-react";
import { getEffortPillClasses, type EffortLabel } from "@/lib/effort";

export type TodayCandidate = {
  id: string;
  title: string;
  effort: EffortLabel | null;
  timeLine: string | null;
  batchFriendly: boolean;
  emoji: string;
  colorClass: string;
};

// A shuffled, fixed order the reroll button steps through, rather than a
// fresh random pick each time, so pressing it repeatedly can't land back
// on the same suggestion twice in a row by chance.
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function TodaySuggestionCard({ candidates }: { candidates: TodayCandidate[] }) {
  const [order] = useState(() => shuffled(candidates));
  const [index, setIndex] = useState(0);

  if (order.length === 0) {
    return (
      <div className="rounded-2xl bg-cream-grey p-4 shadow-sm">
        <p className="text-sm font-semibold text-ink">🎲 What should I cook today</p>
        <p className="mt-1.5 text-sm text-cream-grey-text">
          Nothing quite fits right now, nothing you have everything for looks
          right for today. Check What Can I Make for the full list.
        </p>
      </div>
    );
  }

  const pick = order[index % order.length];

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-amber bg-card">
      <div className="flex items-center justify-between bg-amber px-4 py-2">
        <span className="text-[11px] font-bold tracking-wide text-amber-text uppercase">
          Tonight&apos;s pick
        </span>
        {order.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-amber-text"
          >
            <IconDice5 size={12} stroke={2} />
            Reroll
          </button>
        )}
      </div>
      <Link href={`/recipes/${pick.id}`} className="flex items-center gap-3 p-4">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${pick.colorClass}`}
        >
          {pick.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{pick.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {pick.effort && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(pick.effort)}`}
              >
                {pick.effort}
              </span>
            )}
            {pick.timeLine && (
              <span className="shrink-0 rounded-full bg-cream-grey px-2 py-0.5 text-[11px] font-medium text-cream-grey-text">
                {pick.timeLine}
              </span>
            )}
            {pick.batchFriendly && (
              <span className="shrink-0 rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-medium text-amber-text">
                batch
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

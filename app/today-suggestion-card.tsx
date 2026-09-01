"use client";

import { useState } from "react";
import Link from "next/link";
import { IconDice5, IconSparkles } from "@tabler/icons-react";
import { getEffortPillClasses, type EffortLabel } from "@/lib/effort";

export type TodayCandidate = {
  id: string;
  title: string;
  effort: EffortLabel | null;
  timeLine: string | null;
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
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-sage-deep">
          <IconSparkles size={16} stroke={1.75} />
          What should I cook today
        </div>
        <p className="mt-1.5 text-sm text-text-muted">
          Nothing quite fits right now, nothing you have everything for looks
          right for today. Check What Can I Make for the full list.
        </p>
      </div>
    );
  }

  const pick = order[index % order.length];

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-sage-deep">
        <IconSparkles size={16} stroke={1.75} />
        What should I cook today
      </div>
      <Link
        href={`/recipes/${pick.id}`}
        className="mt-2 flex items-center justify-between gap-2"
      >
        <span className="font-medium text-sage-darker">{pick.title}</span>
        {pick.effort && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(pick.effort)}`}
          >
            {pick.effort}
          </span>
        )}
      </Link>
      {pick.timeLine && <p className="mt-1 text-xs text-text-muted">{pick.timeLine}</p>}
      {order.length > 1 && (
        <button
          type="button"
          onClick={() => setIndex((i) => i + 1)}
          className="mt-2 flex items-center gap-1 text-xs text-sage-deep"
        >
          <IconDice5 size={14} stroke={1.75} />
          Something else
        </button>
      )}
    </div>
  );
}

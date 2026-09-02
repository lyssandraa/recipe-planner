"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconClock } from "@tabler/icons-react";
import { getEffortPillClasses, type EffortLabel } from "@/lib/effort";
import EmptyState from "@/app/components/empty-state";

type Card = {
  id: string;
  title: string;
  effort: EffortLabel | null;
  timeLine: string | null;
  missingCount: number;
  missingNames: string[];
  suggestionScore: number;
};

const EFFORTS: EffortLabel[] = ["Low", "Medium", "High"];
const BUCKET_ORDER = ["Have everything", "Missing 1", "Missing 2", "Missing 3+"];
const EFFORT_RANK: Record<EffortLabel, number> = { Low: 0, Medium: 1, High: 2 };
type SortMode = "suggested" | "effort";

function bucketFor(count: number): string {
  if (count === 0) return "Have everything";
  if (count === 1) return "Missing 1";
  if (count === 2) return "Missing 2";
  return "Missing 3+";
}

export default function WhatCanIMakeList({ cards }: { cards: Card[] }) {
  const [effortFilter, setEffortFilter] = useState<EffortLabel | "All">("All");
  const [sortMode, setSortMode] = useState<SortMode>("suggested");

  const filtered = useMemo(
    () =>
      effortFilter === "All"
        ? cards
        : cards.filter((c) => c.effort === effortFilter),
    [cards, effortFilter]
  );

  const groups = useMemo(() => {
    const byBucket = new Map<string, Card[]>(BUCKET_ORDER.map((k) => [k, []]));
    for (const card of filtered) {
      byBucket.get(bucketFor(card.missingCount))!.push(card);
    }
    if (sortMode === "effort") {
      for (const bucket of byBucket.values()) {
        bucket.sort(
          (a, b) => (a.effort ? EFFORT_RANK[a.effort] : 1) - (b.effort ? EFFORT_RANK[b.effort] : 1)
        );
      }
    }
    return BUCKET_ORDER.map((key) => ({ key, cards: byBucket.get(key)! })).filter(
      (g) => g.cards.length > 0
    );
  }, [filtered, sortMode]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto">
          {(["All", ...EFFORTS] as const).map((option, i) => (
            <button
              key={option}
              type="button"
              onClick={() => setEffortFilter(option)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`motion-safe:animate-pop-in shrink-0 rounded-full bg-cream-grey px-3 py-1 text-xs font-medium text-cream-grey-text shadow-sm ${
                effortFilter === option ? "ring-2 ring-green-deep" : ""
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="shrink-0 rounded-[12px] border border-border-soft bg-card px-2 py-1 text-xs text-ink-soft"
        >
          <option value="suggested">Suggested</option>
          <option value="effort">Sort by effort</option>
        </select>
      </div>

      {groups.length === 0 && (
        <EmptyState
          emoji="🍲"
          message="No dinner recipes match that effort level."
          hint="Try a different filter."
        />
      )}

      {groups.map((group) => (
        <section key={group.key} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-green-deep">
            {group.key}{" "}
            <span className="font-normal text-ink-soft">
              ({group.cards.length})
            </span>
          </h2>
          <ul className="flex flex-col gap-2">
            {group.cards.map((card, i) => (
              <li key={card.id}>
                <Link
                  href={`/recipes/${card.id}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="motion-safe:animate-fade-up motion-safe:hover:-translate-y-[3px] motion-safe:transition-transform motion-safe:duration-[180ms] motion-safe:ease-out block rounded-2xl bg-card p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{card.title}</span>
                    {card.effort && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getEffortPillClasses(card.effort)}`}
                      >
                        {card.effort}
                      </span>
                    )}
                  </div>
                  {card.timeLine && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                      <IconClock size={13} stroke={1.75} />
                      {card.timeLine}
                    </div>
                  )}
                  {card.missingNames.length > 0 && (
                    <div className="mt-1 text-xs text-terracotta-text">
                      Missing: {card.missingNames.join(", ")}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

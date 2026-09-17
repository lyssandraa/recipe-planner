"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChevronDown, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import StatsStrip, { type StatCell } from "@/app/components/stats-strip";
import EmptyState from "@/app/components/empty-state";
import { addMonths, formatMonthLabel, formatMonthParam, parseMonthParam } from "@/lib/month";
import { formatGBP } from "@/lib/currency";
import type { MonthlyShoppingSummary } from "../actions";

export default function TrackerView({
  monthParam,
  summary,
}: {
  monthParam: string;
  summary: MonthlyShoppingSummary;
}) {
  const [openTripId, setOpenTripId] = useState<string | null>(null);

  const monthStart = parseMonthParam(monthParam);
  const prevMonth = formatMonthParam(addMonths(monthStart, -1));
  const nextMonth = formatMonthParam(addMonths(monthStart, 1));

  const avgSpend =
    summary.tripsWithSpend > 0 ? summary.totalSpent / summary.tripsWithSpend : null;

  const cells: StatCell[] = [
    { value: formatGBP(summary.totalSpent), label: "spent" },
    { value: summary.trips.length, label: summary.trips.length === 1 ? "trip" : "trips" },
    { value: avgSpend != null ? formatGBP(avgSpend) : "-", label: "avg/trip" },
    { value: summary.totalItems, label: "items" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/shopping-list/tracker?month=${prevMonth}`}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-soft shadow-sm"
        >
          <IconChevronLeft size={16} stroke={2} />
        </Link>
        <span className="text-sm font-semibold text-ink">{formatMonthLabel(monthStart)}</span>
        <Link
          href={`/shopping-list/tracker?month=${nextMonth}`}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-ink-soft shadow-sm"
        >
          <IconChevronRight size={16} stroke={2} />
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border-b-[3px] border-lime shadow-sm">
        <StatsStrip cells={cells} />
      </div>

      {summary.trips.length === 0 ? (
        <EmptyState
          emoji="🧾"
          message="No shopping logged this month."
          hint="Trips are logged from the shopping list's 'Clear' button once you've ticked things off."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {summary.trips.map((trip) => {
            const open = openTripId === trip.id;
            const date = new Date(trip.date);
            return (
              <li key={trip.id} className="overflow-hidden rounded-2xl bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenTripId(open ? null : trip.id)}
                  className="flex w-full items-center gap-3 p-3.5"
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-ink">
                      {date.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {trip.itemCount} item{trip.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink">
                    {trip.totalSpent != null ? formatGBP(trip.totalSpent) : "not logged"}
                  </span>
                  <IconChevronDown
                    size={16}
                    stroke={2}
                    className={`shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="flex flex-wrap gap-1.5 border-t border-border-soft px-3.5 py-3">
                    {trip.itemNames.map((name, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-cream-grey px-2.5 py-1 text-xs text-cream-grey-text"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import StatsStrip, { type StatCell } from "@/app/components/stats-strip";
import EmptyState from "@/app/components/empty-state";
import { useToast } from "@/app/components/toast-provider";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { addMonths, formatMonthLabel, formatMonthParam, parseMonthParam } from "@/lib/month";
import { formatGBP } from "@/lib/currency";
import {
  addManualShoppingTrip,
  updateShoppingTrip,
  deleteShoppingTrip,
  type MonthlyShoppingSummary,
} from "../actions";

function todayParam(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TrackerView({
  monthParam,
  summary,
}: {
  monthParam: string;
  summary: MonthlyShoppingSummary;
}) {
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(todayParam());
  const [newAmount, setNewAmount] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  useEscapeToClose(adding, () => setAdding(false));

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

  function openEdit(tripId: string, currentAmount: number | null) {
    setEditingTripId(tripId);
    setEditAmount(currentAmount != null ? String(currentAmount) : "");
  }

  function handleSaveEdit(tripId: string) {
    const trimmed = editAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    startTransition(async () => {
      await updateShoppingTrip(tripId, amount != null && !Number.isNaN(amount) ? amount : null);
      setEditingTripId(null);
      toast("Updated");
      router.refresh();
    });
  }

  function handleDeleteTrip(tripId: string) {
    if (!confirm("Delete this trip? This can't be undone.")) return;
    startTransition(async () => {
      await deleteShoppingTrip(tripId);
      toast("Deleted");
      router.refresh();
    });
  }

  function handleAddExpense() {
    const trimmed = newAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    startTransition(async () => {
      await addManualShoppingTrip({
        date: newDate,
        totalSpent: amount != null && !Number.isNaN(amount) ? amount : null,
        note: newNote,
      });
      setAdding(false);
      setNewAmount("");
      setNewNote("");
      setNewDate(todayParam());
      toast("Expense added");
      router.refresh();
    });
  }

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

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex items-center justify-center gap-2 rounded-[12px] border-2 border-green-deep px-4 py-2.5 text-sm font-medium text-green-deep"
      >
        <IconPlus size={16} stroke={2} />
        Add expense
      </button>

      {summary.trips.length === 0 ? (
        <EmptyState
          emoji="🧾"
          message="No shopping logged this month."
          hint="Trips are logged from the shopping list's 'Clear' button, or add one directly above."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {summary.trips.map((trip) => {
            const open = openTripId === trip.id;
            const editing = editingTripId === trip.id;
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
                  <div className="border-t border-border-soft px-3.5 py-3">
                    {trip.itemNames.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
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
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <label className="flex flex-1 items-center gap-2 rounded-[12px] border border-border-soft px-3 py-2">
                          <span className="text-sm text-ink-soft">£</span>
                          <input
                            autoFocus
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full border-none bg-transparent text-sm text-ink focus:outline-none"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleSaveEdit(trip.id)}
                          className="rounded-[12px] bg-green-deep px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTripId(null)}
                          aria-label="Cancel"
                          className="text-ink-soft"
                        >
                          <IconX size={16} stroke={2} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => openEdit(trip.id, trip.totalSpent)}
                          className="flex items-center gap-1.5 text-xs font-medium text-green-deep"
                        >
                          <IconPencil size={14} stroke={1.75} />
                          Edit amount
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-terracotta-text disabled:opacity-50"
                        >
                          <IconTrash size={14} stroke={1.75} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4">
          <div className="w-full max-w-[380px] rounded-2xl bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Add expense</h2>
              <button
                type="button"
                onClick={() => setAdding(false)}
                aria-label="Cancel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-[12px] border border-border-soft px-3 py-2.5 text-sm text-ink"
              />
              <label className="flex items-center gap-2 rounded-[12px] border border-border-soft px-3 py-2.5">
                <span className="text-sm text-ink-soft">£</span>
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                />
              </label>
              <input
                placeholder="What was it for? (optional, comma separated)"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="rounded-[12px] border border-border-soft px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft"
              />
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={handleAddExpense}
              className="mt-3 w-full rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add expense"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

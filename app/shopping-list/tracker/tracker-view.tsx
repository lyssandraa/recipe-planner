"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import StatsStrip, { type StatCell } from "@/app/components/stats-strip";
import EmptyState from "@/app/components/empty-state";
import { useToast } from "@/app/components/toast-provider";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { addMonths, formatMonthLabel, formatMonthParam, parseMonthParam } from "@/lib/month";
import { formatGBP } from "@/lib/currency";
import { compressImageFile } from "@/lib/compressImage";
import {
  saveShoppingTrip,
  parseReceiptImage,
  updateShoppingTrip,
  deleteShoppingTrip,
  type MonthlyShoppingSummary,
  type ShoppingTripData,
} from "../actions";
import TripItemEditor, { nextTripItemKey, type EditableTripItem } from "./trip-item-editor";

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
  // null while adding a brand new trip, an id while editing an existing
  // one, both share the same modal/editor below rather than two separate
  // UIs for what's otherwise the same date/amount/items shape.
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState(todayParam());
  const [newAmount, setNewAmount] = useState("");
  const [newItems, setNewItems] = useState<EditableTripItem[]>([]);
  const [fromScan, setFromScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
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

  function openEditTrip(trip: ShoppingTripData) {
    setEditingTripId(trip.id);
    setFromScan(false);
    setScanError(null);
    setNewDate(trip.date.slice(0, 10));
    setNewAmount(trip.totalSpent != null ? String(trip.totalSpent) : "");
    setNewItems(
      trip.items.map((i) => ({
        key: nextTripItemKey(),
        name: i.name,
        quantityText: i.quantityText ?? "",
        price: i.price != null ? String(i.price) : "",
      }))
    );
    setAdding(true);
  }

  function handleDeleteTrip(tripId: string) {
    if (!confirm("Delete this trip? This can't be undone.")) return;
    startTransition(async () => {
      await deleteShoppingTrip(tripId);
      toast("Deleted");
      router.refresh();
    });
  }

  function openAdd() {
    setEditingTripId(null);
    setNewDate(todayParam());
    setNewAmount("");
    setNewItems([]);
    setFromScan(false);
    setScanError(null);
    setAdding(true);
  }

  // The file input's change handler, not a separate "scan" button: tapping
  // "Scan receipt" opens the camera directly (capture="environment"), and
  // OCR runs the moment a photo comes back, landing on the same add-expense
  // review panel manual entry uses, pre-filled instead of blank.
  function handleReceiptFile(file: File) {
    setScanError(null);
    setScanning(true);
    startTransition(async () => {
      try {
        const compressed = await compressImageFile(file);
        const formData = new FormData();
        formData.set("file", compressed);
        const result = await parseReceiptImage(formData);
        setEditingTripId(null);
        setNewDate(todayParam());
        setNewAmount(result.totalSpent != null ? String(result.totalSpent) : "");
        setNewItems(
          result.items.map((i) => ({
            key: nextTripItemKey(),
            name: i.name,
            quantityText: i.quantityText ?? "",
            price: i.price != null ? String(i.price) : "",
          }))
        );
        setFromScan(true);
        setAdding(true);
      } catch (e) {
        setScanError(e instanceof Error ? e.message : "Couldn't read that receipt.");
      } finally {
        setScanning(false);
        if (receiptInputRef.current) receiptInputRef.current.value = "";
      }
    });
  }

  function handleSaveTrip() {
    const trimmed = newAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    const items = newItems
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name,
        quantityText: i.quantityText || null,
        price: i.price.trim() ? Number(i.price) : null,
      }));
    const totalSpent = amount != null && !Number.isNaN(amount) ? amount : null;

    startTransition(async () => {
      if (editingTripId) {
        await updateShoppingTrip(editingTripId, { date: newDate, totalSpent, items });
        toast("Trip updated");
      } else {
        await saveShoppingTrip({ date: newDate, totalSpent, items });
        toast("Expense added");
      }
      setAdding(false);
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

      {summary.predictedNextTrip != null && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-amber-tint px-4 py-3">
          <IconSparkles size={18} stroke={1.75} className="shrink-0 text-amber-text" />
          <p className="text-sm text-amber-text">
            Your next shop will probably cost around{" "}
            <span className="font-semibold">{formatGBP(summary.predictedNextTrip)}</span>, based
            on recent priced trips.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={openAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-green-deep px-4 py-2.5 text-sm font-medium text-green-deep"
        >
          <IconPlus size={16} stroke={2} />
          Add expense
        </button>
        <button
          type="button"
          disabled={scanning}
          onClick={() => receiptInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <IconReceipt size={16} stroke={1.75} />
          {scanning ? "Reading…" : "Scan receipt"}
        </button>
        <input
          ref={receiptInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleReceiptFile(file);
          }}
        />
      </div>
      {scanError && <p className="text-sm text-terracotta-text">{scanError}</p>}

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
                    {trip.items.length > 0 && (
                      <ul className="mb-3 flex flex-col divide-y divide-border-soft">
                        {trip.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 py-1.5 text-sm">
                            <span className="min-w-0 flex-1 truncate text-ink">
                              {item.name}
                              {item.quantityText && (
                                <span className="text-ink-soft"> · {item.quantityText}</span>
                              )}
                            </span>
                            <span className="shrink-0 text-ink-soft">
                              {item.price != null ? formatGBP(item.price) : "-"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => openEditTrip(trip)}
                        className="flex items-center gap-1.5 text-xs font-medium text-green-deep"
                      >
                        <IconPencil size={14} stroke={1.75} />
                        Edit
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
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 p-4">
          <div className="flex max-h-[85vh] w-full max-w-[380px] flex-col rounded-2xl bg-card shadow-lg">
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="text-sm font-semibold text-ink">
                {fromScan ? "Review scanned receipt" : editingTripId ? "Edit trip" : "Add expense"}
              </h2>
              <button
                type="button"
                onClick={() => setAdding(false)}
                aria-label="Cancel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={16} stroke={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4">
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
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Total (optional)"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                  />
                </label>
              </div>
              <p className="mt-3 mb-1.5 text-xs font-medium text-ink-soft">
                {fromScan
                  ? "Double check these, local OCR isn't perfect, fix or remove anything wrong."
                  : "Items (optional, for price history)"}
              </p>
              <TripItemEditor items={newItems} onChange={setNewItems} />
            </div>
            <div className="p-4 pt-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveTrip}
                className="w-full rounded-[12px] bg-green-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "Saving…" : editingTripId ? "Save changes" : "Add expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

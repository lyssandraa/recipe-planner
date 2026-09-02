"use client";

import { useEffect, useRef, useState } from "react";
import { useBackOrFallback } from "@/lib/useBackOrFallback";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import type { Unit } from "@prisma/client";
import { scaleQuantity } from "@/lib/servingScale";
import { formatQuantityUnit } from "@/lib/units";
import { getStepIngredientIds, type RecipeStep } from "@/lib/instructions";

type CookIngredient = {
  id: string;
  ingredientId: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  optional: boolean;
  ingredient: { name: string; plural: string | null };
};

// Keeps the screen on for the duration of cook mode, released automatically
// when the component unmounts (navigating away). Devices without support
// (most desktop browsers, some older phones) just get a small note, never
// a crash, cooking still works fine without it. Support is known
// synchronously (the API either exists or it doesn't), so it's read once
// as the initial state rather than detected via an effect.
function useWakeLock(): boolean {
  const [supported] = useState(
    () => typeof navigator !== "undefined" && "wakeLock" in navigator
  );
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      })
      .catch(() => {
        // Request failed at runtime (e.g. permission denied). The capability
        // note above only covers "not supported at all", so just proceed
        // without a lock rather than trying to reflect this case too.
      });

    return () => {
      cancelled = true;
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [supported]);

  return supported;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
    oscillator.onended = () => ctx.close();
  } catch {
    // No audio available, fail quietly.
  }
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Mounted fresh (via a `key` on stepIndex) each time the step changes, so
// its countdown state starts clean without needing an effect to reset it.
function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function start() {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          playBeep();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-5 shadow-sm">
      <span className="text-4xl font-semibold text-ink">
        {formatCountdown(remaining)}
      </span>
      <button
        type="button"
        onClick={start}
        disabled={running}
        className="flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        <IconPlayerPlay size={18} stroke={2} />
        {running ? "Running…" : "Start timer"}
      </button>
    </div>
  );
}

export default function CookMode({
  recipeId,
  title,
  originalServings,
  servings,
  ingredients,
  steps,
}: {
  recipeId: string;
  title: string;
  originalServings: number | null;
  servings: number;
  ingredients: CookIngredient[];
  steps: RecipeStep[];
}) {
  const wakeLockSupported = useWakeLock();
  const [stepIndex, setStepIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const exitCookMode = useBackOrFallback(`/recipes/${recipeId}`);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") exitCookMode();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = steps[stepIndex];

  const canScale = originalServings != null && originalServings > 0;
  const factor = canScale ? servings / originalServings! : 1;

  const ingredientLookup = new Map(ingredients.map((ri) => [ri.ingredientId, ri]));
  const namesForMatching = ingredients.map((ri) => ({
    id: ri.ingredientId,
    name: ri.ingredient.name,
  }));
  const stepIngredientIds = getStepIngredientIds(step, namesForMatching);
  const stepIngredients = stepIngredientIds
    .map((id) => ingredientLookup.get(id))
    .filter((x): x is CookIngredient => !!x);

  function toggleDone() {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) next.delete(stepIndex);
      else next.add(stepIndex);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-cream">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <header className="flex items-center justify-between bg-green-deep px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
          <button
            type="button"
            onClick={exitCookMode}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Exit cook mode"
          >
            <IconX size={22} stroke={2} />
          </button>
          <span className="truncate px-2 text-sm font-medium text-white">{title}</span>
          <span className="w-10" />
        </header>

        {!wakeLockSupported && (
          <p className="bg-amber-tint px-4 py-1.5 text-center text-xs text-amber-text">
            Screen wake lock isn&apos;t supported on this device, it may turn off while you cook.
          </p>
        )}

        <div className="px-4 pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-soft">
            <div
              className="h-full rounded-full bg-green-deep transition-all"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Step {stepIndex + 1} of {steps.length}
            {canScale && ` · serving ${servings}`}
          </p>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-6 px-5 py-6">
          <p className="text-2xl leading-snug font-semibold text-ink">{step.text}</p>

          {stepIngredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {stepIngredients.map((si) => {
                const scaledQty = canScale
                  ? scaleQuantity(si.quantity, si.unit, factor)
                  : si.quantity;
                return (
                  <span
                    key={si.id}
                    className="rounded-full bg-card px-3 py-2 text-base text-ink shadow-sm"
                  >
                    {formatQuantityUnit(scaledQty, si.unit)} {si.ingredient.name}
                  </span>
                );
              })}
            </div>
          )}

          {step.timerSeconds != null && (
            <StepTimer key={stepIndex} seconds={step.timerSeconds} />
          )}

          <button
            type="button"
            onClick={toggleDone}
            className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-medium ${
              doneSteps.has(stepIndex)
                ? "bg-green-deep text-white"
                : "border-2 border-border-soft text-ink-soft"
            }`}
          >
            <IconCheck size={22} stroke={2.5} />
            {doneSteps.has(stepIndex) ? "Done" : "Mark done"}
          </button>
        </div>

        <div className="flex gap-3 px-4 pb-6">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-card py-4 text-base font-medium text-ink shadow-sm disabled:opacity-40"
          >
            <IconChevronLeft size={20} stroke={2} />
            Back
          </button>
          <button
            type="button"
            disabled={stepIndex === steps.length - 1}
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-green-deep py-4 text-base font-medium text-white disabled:opacity-40"
          >
            Next
            <IconChevronRight size={20} stroke={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

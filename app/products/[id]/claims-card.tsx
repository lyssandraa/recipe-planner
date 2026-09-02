"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { ClaimType } from "@prisma/client";
import { IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import { findClaimMatches, type ClaimDefinition } from "@/lib/claims";
import { addManualClaim } from "../actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "@/app/components/toast-provider";

export type ClaimData = {
  id: string;
  claimText: string;
  claimType: ClaimType;
  explanation: string | null;
};

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  CERTIFIED: "Certified",
  REGULATED: "Regulated",
  UNREGULATED: "Unregulated",
  UNRECOGNISED: "Unrecognised",
};

// Only the three known-table types get their own picker section, in this
// order. UNRECOGNISED is never something to pick, it's what you get when
// nothing in the table matches.
const CLAIM_TYPE_GROUP_ORDER: ClaimType[] = ["CERTIFIED", "REGULATED", "UNREGULATED"];

function pillClasses(type: ClaimType): string {
  switch (type) {
    case "CERTIFIED":
    case "REGULATED":
      return "bg-lime-tint text-green-deep";
    case "UNREGULATED":
    case "UNRECOGNISED":
      return "bg-cream-grey text-cream-grey-text";
  }
}

function ClaimRow({ claim }: { claim: ClaimData }) {
  const [open, setOpen] = useState(false);
  useEscapeToClose(open, () => setOpen(false));
  return (
    <li className="px-3 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm text-ink">{claim.claimText}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses(claim.claimType)}`}
        >
          {CLAIM_TYPE_LABELS[claim.claimType]}
        </span>
      </button>
      {open && (
        <p className="mt-1.5 text-xs text-ink-soft">
          {claim.explanation ?? "No definition on file yet."}
        </p>
      )}
    </li>
  );
}

// The add flow is a picker, not a form: search the known claims table
// (grouped by type) and select rather than type a type in yourself. Free
// text is still there as a fallback, underneath the picker, for whatever
// doesn't match, which saves as UNRECOGNISED.
type Stage =
  | { step: "search" }
  | { step: "confirm-match"; def: ClaimDefinition }
  | { step: "confirm-unrecognised" };

export default function ClaimsCard({
  productId,
  claims: initial,
}: {
  productId: string;
  claims: ClaimData[];
}) {
  const [claims, setClaims] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>({ step: "search" });
  const [claimTextDraft, setClaimTextDraft] = useState("");
  const [unrecognisedNote, setUnrecognisedNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(adding, () => closeAdding());

  const matches = useMemo(() => findClaimMatches(query), [query]);
  const grouped = useMemo(
    () =>
      CLAIM_TYPE_GROUP_ORDER.map((type) => ({
        type,
        items: matches.filter((m) => m.claimType === type),
      })).filter((g) => g.items.length > 0),
    [matches]
  );

  function closeAdding() {
    setAdding(false);
    setQuery("");
    setStage({ step: "search" });
    setClaimTextDraft("");
    setUnrecognisedNote("");
  }

  function selectMatch(def: ClaimDefinition) {
    setClaimTextDraft(def.label);
    setStage({ step: "confirm-match", def });
  }

  function startUnrecognised() {
    setClaimTextDraft(query.trim());
    setStage({ step: "confirm-unrecognised" });
  }

  function handleSaveMatch(def: ClaimDefinition) {
    startTransition(async () => {
      const created = await addManualClaim(productId, claimTextDraft, def.claimType, def.explanation);
      setClaims((prev) => [...prev, created]);
      toast("Claim added");
      closeAdding();
    });
  }

  function handleSaveUnrecognised() {
    startTransition(async () => {
      const created = await addManualClaim(
        productId,
        claimTextDraft,
        "UNRECOGNISED",
        unrecognisedNote.trim() || null
      );
      setClaims((prev) => [...prev, created]);
      toast("Claim added");
      closeAdding();
    });
  }

  return (
    <>
      {claims.length === 0 && !adding && (
        <p className="mb-2 text-sm text-ink-soft">No claims recorded yet.</p>
      )}
      {claims.length > 0 && (
        <ul className="mb-2 flex flex-col divide-y divide-border-soft">
          {claims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} />
          ))}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg bg-cream-grey p-3">
          {stage.step === "search" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Add a claim</span>
                <button
                  type="button"
                  onClick={closeAdding}
                  aria-label="Close"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
                >
                  <IconX size={14} stroke={2} />
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-[12px] border border-border-soft bg-card px-2 py-1.5">
                <IconSearch size={14} stroke={1.75} className="shrink-0 text-ink-soft" />
                <input
                  autoFocus
                  className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                  placeholder="Search, or type what the pack says…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-[12px] bg-card">
                {grouped.length === 0 ? (
                  <p className="p-3 text-xs text-ink-soft">No match in the known claims table.</p>
                ) : (
                  grouped.map((g) => (
                    <div key={g.type} className="border-b border-border-soft last:border-b-0">
                      <p className="px-3 pt-2 text-[10px] font-bold tracking-wide text-ink-soft uppercase">
                        {CLAIM_TYPE_LABELS[g.type]}
                      </p>
                      <ul>
                        {g.items.map((def) => (
                          <li key={def.term}>
                            <button
                              type="button"
                              onClick={() => selectMatch(def)}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink"
                            >
                              {def.label}
                              <IconChevronRight size={14} stroke={1.75} className="shrink-0 text-ink-soft" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                disabled={!query.trim()}
                onClick={startUnrecognised}
                className="text-left text-xs text-green-deep disabled:opacity-40"
              >
                Can&apos;t find it? Save &quot;{query.trim() || "…"}&quot; as your own text
              </button>
            </>
          )}

          {stage.step === "confirm-match" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Confirm claim</span>
                <button
                  type="button"
                  onClick={() => setStage({ step: "search" })}
                  className="text-xs text-ink-soft underline"
                >
                  Back
                </button>
              </div>
              <input
                className="rounded-[12px] border border-border-soft bg-card px-2 py-1.5 text-sm"
                value={claimTextDraft}
                onChange={(e) => setClaimTextDraft(e.target.value)}
              />
              <span
                className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses(stage.def.claimType)}`}
              >
                {CLAIM_TYPE_LABELS[stage.def.claimType]}
              </span>
              <p className="text-xs text-ink-soft">{stage.def.explanation}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending || !claimTextDraft.trim()}
                  onClick={() => handleSaveMatch(stage.def)}
                  className="rounded-[12px] bg-green-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Add claim"}
                </button>
                <button type="button" onClick={closeAdding} className="text-xs text-ink-soft">
                  Cancel
                </button>
              </div>
            </>
          )}

          {stage.step === "confirm-unrecognised" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">Confirm claim</span>
                <button
                  type="button"
                  onClick={() => setStage({ step: "search" })}
                  className="text-xs text-ink-soft underline"
                >
                  Back
                </button>
              </div>
              <input
                className="rounded-[12px] border border-border-soft bg-card px-2 py-1.5 text-sm"
                value={claimTextDraft}
                onChange={(e) => setClaimTextDraft(e.target.value)}
              />
              <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses("UNRECOGNISED")}`}>
                Unrecognised, not in the known claims table
              </span>
              <textarea
                className="rounded-[12px] border border-border-soft bg-card px-2 py-1.5 text-sm"
                rows={2}
                placeholder="What does this mean? (optional)"
                value={unrecognisedNote}
                onChange={(e) => setUnrecognisedNote(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isPending || !claimTextDraft.trim()}
                  onClick={handleSaveUnrecognised}
                  className="rounded-[12px] bg-green-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Add claim"}
                </button>
                <button type="button" onClick={closeAdding} className="text-xs text-ink-soft">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs text-green-deep">
          + Add a claim
        </button>
      )}

      <Link
        href="/products/unrecognised-claims"
        className="mt-2 block text-xs text-ink-soft underline"
      >
        See all unrecognised claims
      </Link>
    </>
  );
}

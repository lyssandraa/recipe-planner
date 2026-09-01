"use client";

import { useState, useTransition } from "react";
import type { ClaimType } from "@prisma/client";
import { KNOWN_CLAIMS } from "@/lib/claims";
import { addManualClaim } from "../actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { useToast } from "@/app/components/toast-provider";

export type ClaimData = {
  id: string;
  claimText: string;
  claimType: ClaimType;
  explanation: string;
};

const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  CERTIFIED: "Certified",
  REGULATED: "Regulated",
  UNREGULATED: "Unregulated",
};

function pillClasses(type: ClaimType): string {
  switch (type) {
    case "CERTIFIED":
      return "bg-sage-deep text-white";
    case "REGULATED":
      return "bg-peridot-tint text-olive-text";
    case "UNREGULATED":
      return "bg-border-soft text-text-muted";
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
        <span className="text-sm text-sage-darker">{claim.claimText}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${pillClasses(claim.claimType)}`}
        >
          {CLAIM_TYPE_LABELS[claim.claimType]}
        </span>
      </button>
      {open && <p className="mt-1.5 text-xs text-text-muted">{claim.explanation}</p>}
    </li>
  );
}

export default function ClaimsCard({
  productId,
  claims: initial,
}: {
  productId: string;
  claims: ClaimData[];
}) {
  const [claims, setClaims] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimType, setClaimType] = useState<ClaimType>("UNREGULATED");
  const [explanation, setExplanation] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  useEscapeToClose(adding, () => setAdding(false));

  function handleTextChange(value: string) {
    setClaimText(value);
    const known = KNOWN_CLAIMS.find((def) => value.trim().toLowerCase().includes(def.term));
    if (known) {
      setClaimType(known.claimType);
      setExplanation(known.explanation);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const created = await addManualClaim(
        productId,
        claimText,
        claimType,
        explanation
      );
      setClaims((prev) => [...prev, created]);
      setClaimText("");
      setExplanation("");
      setClaimType("UNREGULATED");
      setAdding(false);
      toast("Claim added");
    });
  }

  return (
    <>
      {claims.length === 0 && !adding && (
        <p className="mb-2 text-sm text-text-muted">No claims recorded yet.</p>
      )}
      {claims.length > 0 && (
        <ul className="mb-2 flex flex-col divide-y divide-border-soft">
          {claims.map((claim) => (
            <ClaimRow key={claim.id} claim={claim} />
          ))}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border-soft bg-card p-3">
          <input
            className="rounded-md border border-border-soft px-2 py-1.5 text-sm"
            placeholder="Claim text, e.g. Rainforest Alliance"
            value={claimText}
            onChange={(e) => handleTextChange(e.target.value)}
          />
          <select
            className="rounded-md border border-border-soft px-2 py-1.5 text-sm"
            value={claimType}
            onChange={(e) => setClaimType(e.target.value as ClaimType)}
          >
            <option value="CERTIFIED">Certified</option>
            <option value="REGULATED">Regulated</option>
            <option value="UNREGULATED">Unregulated</option>
          </select>
          <textarea
            className="rounded-md border border-border-soft px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPending || !claimText.trim() || !explanation.trim()}
              onClick={handleSave}
              className="rounded-md bg-sage-deep px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-sage-deep"
        >
          + Add a claim
        </button>
      )}
    </>
  );
}

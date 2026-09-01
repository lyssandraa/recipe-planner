"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualProduct } from "../actions";
import { useBackOrFallback } from "@/lib/useBackOrFallback";
import { useUnsavedChangesWarning } from "@/lib/useUnsavedChangesWarning";
import { useToast } from "@/app/components/toast-provider";

export default function ManualProductForm({
  barcode: initialBarcode,
}: {
  barcode: string;
}) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [rawIngredientsText, setRawIngredientsText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const goBack = useBackOrFallback("/scan");

  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDirty(true);
  }, [barcode, name, brand, countryOfOrigin, rawIngredientsText, imageUrl]);

  function handleCancel() {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    goBack();
  }

  function handleSubmit() {
    setError(null);
    if (!barcode.trim()) {
      setError("Barcode is required.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    startTransition(async () => {
      try {
        setDirty(false);
        const { productId } = await createManualProduct({
          barcode: barcode.trim(),
          name: name.trim(),
          brand: brand.trim() || null,
          countryOfOrigin: countryOfOrigin.trim() || null,
          rawIngredientsText: rawIngredientsText.trim() || null,
          imageUrl: imageUrl.trim() || null,
        });
        toast("Product saved");
        router.push(`/products/${productId}`);
      } catch {
        setDirty(true);
        setError(
          "Couldn't save, that barcode may already be recorded against another product."
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Barcode</label>
        <input
          className={`rounded-md border border-border-soft px-3 py-2 text-sm ${
            initialBarcode ? "bg-page-bg text-text-muted" : ""
          }`}
          value={barcode}
          readOnly={!!initialBarcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Name</label>
        <input
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Brand</label>
        <input
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Country of origin</label>
        <input
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          value={countryOfOrigin}
          onChange={(e) => setCountryOfOrigin(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Ingredients label text</label>
        <textarea
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          rows={4}
          placeholder="e.g. Wheat Flour, Sugar, Vegetable Oil (Palm, Sunflower), Raising Agent (E450), Salt"
          value={rawIngredientsText}
          onChange={(e) => setRawIngredientsText(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Image URL</label>
        <input
          className="rounded-md border border-border-soft px-3 py-2 text-sm"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex-1 rounded-md bg-sage-deep px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save product"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="rounded-md border border-border-soft px-4 py-2.5 text-sm font-medium text-sage-darker disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

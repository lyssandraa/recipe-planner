"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Html5QrcodeScanner } from "html5-qrcode";
import { IconCamera, IconX } from "@tabler/icons-react";
import { lookupBarcode } from "@/app/products/actions";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

const SCANNER_ELEMENT_ID = "barcode-scanner-region";

export default function BarcodeScanner() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;

      const scanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        { fps: 10, qrbox: { width: 260, height: 150 } },
        false
      );

      scanner.render(
        (decodedText: string) => {
          if (handledRef.current) return;
          handledRef.current = true;
          scanner.clear().catch(() => {});
          handleBarcode(decodedText);
        },
        () => {
          // Per-frame decode misses are expected while aiming, ignore them.
        }
      );

      scannerRef.current = scanner;
    });

    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {
        setCameraError(
          "Camera didn't start. You can still enter the barcode below."
        );
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen]);

  function closeCamera() {
    scannerRef.current?.clear().catch(() => {});
    setCameraOpen(false);
  }

  useEscapeToClose(cameraOpen, closeCamera);

  function handleBarcode(barcode: string) {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await lookupBarcode(trimmed);
      if (result.status === "not_found") {
        router.push(`/products/new?barcode=${encodeURIComponent(result.barcode)}`);
      } else {
        router.push(`/products/${result.productId}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {cameraOpen ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={closeCamera}
              aria-label="Close camera"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-grey text-ink"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>
          <div id={SCANNER_ELEMENT_ID} className="overflow-hidden rounded-lg" />
          {cameraError && <p className="text-sm text-terracotta-text">{cameraError}</p>}
        </>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCameraError(null);
            setCameraOpen(true);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-2xl bg-green-deep py-8 text-white"
        >
          <IconCamera size={32} stroke={1.5} />
          <span className="text-sm font-medium">Open camera</span>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-ink-soft">
          Or enter the barcode
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-[12px] border border-border-soft px-3 py-2 text-sm"
            inputMode="numeric"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="e.g. 5000112637922"
          />
          <button
            type="button"
            disabled={isPending || !manualBarcode.trim()}
            onClick={() => handleBarcode(manualBarcode)}
            className="shrink-0 rounded-[12px] border-2 border-green-deep px-4 py-2 text-sm font-medium text-green-deep disabled:opacity-50"
          >
            {isPending ? "Looking up…" : "Look up"}
          </button>
        </div>
      </div>
    </div>
  );
}

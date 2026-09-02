"use client";

import { useRef, useState, useTransition } from "react";
import { IconDownload, IconUpload, IconX } from "@tabler/icons-react";
import {
  isBackupFile,
  summarizeBackup,
  type BackupFile,
  type BackupSummary,
} from "@/lib/backup";
import { exportBackup, importBackup, type ImportResult } from "./actions";
import { useToast } from "@/app/components/toast-provider";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsView() {
  const [isExporting, setIsExporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<BackupFile | null>(null);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, startImporting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadJson(data, `recipe-planner-backup-${dateStr}.json`);
      toast("Backup downloaded");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileChosen(file: File) {
    setParseError(null);
    setResult(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isBackupFile(parsed)) {
        setParseError("This doesn't look like a recipe planner backup file.");
        return;
      }
      setPendingFile(parsed);
      setSummary(summarizeBackup(parsed));
    } catch {
      setParseError("Couldn't read that file, it may not be valid JSON.");
    }
  }

  function handleConfirmImport() {
    if (!pendingFile) return;
    startImporting(async () => {
      const res = await importBackup(pendingFile);
      setResult(res);
      setPendingFile(null);
      setSummary(null);
      toast("Backup restored");
    });
  }

  function cancelImport() {
    setPendingFile(null);
    setSummary(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border-b-[3px] border-lime bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-base leading-none">💾</span>
          <h2 className="text-[11px] font-bold tracking-wide text-green-deep uppercase">
            Backup
          </h2>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          Downloads everything as a single JSON file: recipes and their ingredients, steps, tags
          and component links, your ingredient catalog with synonyms and substitutions, pantry
          state, shopping list, cook log, and scanned products with their claims and history.
        </p>
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-green-deep px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          <IconDownload size={18} stroke={1.75} />
          {isExporting ? "Preparing…" : "Download backup"}
        </button>
      </div>

      <div className="rounded-2xl border-b-[3px] border-terracotta bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-base leading-none">📥</span>
          <h2 className="text-[11px] font-bold tracking-wide text-green-deep uppercase">
            Restore
          </h2>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          Restores from a backup file. Matches on names and barcodes, not database ids, so this
          works the same on this device or a fresh install. Existing entries are updated in
          place rather than duplicated.
        </p>

        {!pendingFile && (
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-2 border-terracotta px-4 py-3 text-sm font-medium text-terracotta-text">
            <IconUpload size={18} stroke={1.75} />
            Choose backup file
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
              }}
            />
          </label>
        )}

        {parseError && <p className="mt-2 text-sm text-terracotta-text">{parseError}</p>}

        {summary && pendingFile && (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-cream-grey p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">
                In this file, exported {new Date(pendingFile.exportedAt).toLocaleDateString("en-GB")}
              </span>
              <button
                type="button"
                onClick={cancelImport}
                aria-label="Cancel"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft"
              >
                <IconX size={14} stroke={2} />
              </button>
            </div>
            <ul className="text-sm text-ink">
              <li>{summary.recipes} recipes</li>
              <li>{summary.ingredients} ingredients</li>
              <li>{summary.pantry} pantry items</li>
              <li>{summary.shoppingList} shopping list items</li>
              <li>{summary.cookLog} cook log entries</li>
              <li>{summary.products} scanned products, {summary.claims} claims</li>
            </ul>
            <p className="text-xs text-ink-soft">
              Nothing is written until you confirm. This will overwrite any existing recipe,
              ingredient or product that shares a name or barcode with something in the file.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="rounded-md bg-green-deep px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isImporting ? "Restoring…" : "Confirm restore"}
              </button>
              <button
                type="button"
                onClick={cancelImport}
                disabled={isImporting}
                className="text-sm text-ink-soft"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-3 rounded-lg bg-lime-tint p-3 text-sm text-green-deep">
            Restored {result.recipesWritten} recipes, {result.ingredientsWritten} ingredients,{" "}
            {result.productsWritten} products, {result.pantryWritten} pantry items,{" "}
            {result.shoppingItemsWritten} shopping list items and {result.cookLogWritten} cook log
            entries.
          </div>
        )}
      </div>
    </div>
  );
}

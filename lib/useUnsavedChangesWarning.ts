"use client";

import { useEffect } from "react";

// Warns before a full browser-level navigation away (closing the tab,
// reloading, typing a new URL) while dirty is true. This can't intercept
// in-app client-side navigation (Next.js's router has no hook for that),
// so a form's own Cancel/back control needs to check dirty itself and
// confirm before navigating, this only covers the tab/window level.
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);
}

"use client";

import { useEffect } from "react";

// Registers the offline-shell service worker (public/sw.js). Silently
// no-ops wherever it isn't supported, this is a progressive enhancement,
// not something the app depends on to function.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (e.g. served over plain HTTP in dev on a
      // non-localhost host) shouldn't be user-visible.
    });
  }, []);

  return null;
}

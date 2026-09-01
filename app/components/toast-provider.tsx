"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconCheck } from "@tabler/icons-react";

type ToastMessage = { id: number; text: string };

const ToastContext = createContext<((text: string) => void) | null>(null);

// A brief, unobtrusive confirmation, e.g. "Saved". Not for errors, those
// stay inline next to whatever failed so they don't disappear before
// they're read.
export function useToast(): (text: string) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used within ToastProvider");
  return show;
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const show = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex w-full max-w-[420px] -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="motion-safe:animate-fade-up-sm flex items-center gap-2 rounded-full bg-sage-deep px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            <IconCheck size={15} stroke={2.5} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

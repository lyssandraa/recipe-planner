"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconFlame } from "@tabler/icons-react";
import { logCooked } from "../actions";

export default function CookButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending || done}
      onClick={() => {
        startTransition(async () => {
          await logCooked(recipeId);
          setDone(true);
          router.refresh();
        });
      }}
      className="flex shrink-0 items-center justify-center gap-1.5 rounded-[12px] border border-border-soft bg-white px-3.5 py-3 text-sm font-medium text-sage-darker disabled:opacity-60"
    >
      <IconFlame size={16} stroke={1.75} />
      {done ? "Logged" : isPending ? "Logging…" : "Cooked it"}
    </button>
  );
}

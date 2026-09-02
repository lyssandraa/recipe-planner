"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";

// Typing here and hitting enter (or tapping the field then typing) jumps
// straight to the recipe list with the search already applied there, so
// searching doesn't need its own separate results screen.
export default function DashboardSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function go() {
    const trimmed = query.trim();
    router.push(trimmed ? `/recipes?q=${encodeURIComponent(trimmed)}` : "/recipes");
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2.5 shadow-sm">
      <IconSearch size={16} stroke={1.75} className="shrink-0 text-ink-soft" />
      <input
        className="w-full border-none bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        placeholder="Search recipes, ingredients, tags…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go();
        }}
      />
    </div>
  );
}

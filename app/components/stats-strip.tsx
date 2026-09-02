import type { ReactNode } from "react";

export type StatCell = {
  value: ReactNode;
  label: string;
  valueClassName?: string;
};

// A white row of equal columns divided by thin dividers, each a large
// value over a small muted label. Up to 4 cells lay out as an even grid
// (the recipe page's fixed time/time/effort/batch stats); more than that
// (product nutrition, which varies per product) scrolls horizontally
// instead of squeezing unreadably narrow.
export default function StatsStrip({ cells }: { cells: StatCell[] }) {
  if (cells.length === 0) return null;

  if (cells.length <= 4) {
    return (
      <div
        className="grid divide-x divide-border-soft bg-card"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => (
          <StatCellView key={i} cell={cell} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex divide-x divide-border-soft overflow-x-auto bg-card">
      {cells.map((cell, i) => (
        <div key={i} className="min-w-[76px] shrink-0">
          <StatCellView cell={cell} />
        </div>
      ))}
    </div>
  );
}

function StatCellView({ cell }: { cell: StatCell }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3 text-center">
      <div className={`text-base font-semibold text-ink ${cell.valueClassName ?? ""}`}>
        {cell.value}
      </div>
      <div className="text-[11px] text-ink-soft">{cell.label}</div>
    </div>
  );
}

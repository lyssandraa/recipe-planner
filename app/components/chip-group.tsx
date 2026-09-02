// A labelled row of toggleable chips for one tag dimension (cuisine, mood,
// protein, method, season). Generic over the dimension's own enum type so
// the same component drives the recipe form's pickers and the recipe
// list's filter panel without repeating the toggle/active-state logic five
// times over.
export default function ChipGroup<T extends string>({
  label,
  options,
  labels,
  emoji,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  emoji: Record<T, string>;
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-ink">{label}</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => {
          const active = selected.has(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active ? "bg-green-deep text-white" : "bg-cream-grey text-cream-grey-text"
              }`}
            >
              <span className="mr-1">{emoji[value]}</span>
              {labels[value]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// A large emoji, a friendly line, and a hint about how to fill the list,
// used wherever a list or section would otherwise just be blank.
export default function EmptyState({
  emoji,
  message,
  hint,
}: {
  emoji: string;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-card py-10 text-center">
      <span className="text-4xl">{emoji}</span>
      <p className="max-w-[240px] text-sm font-medium text-ink">{message}</p>
      {hint && <p className="max-w-[220px] text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

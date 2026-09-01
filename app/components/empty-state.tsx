import type { ReactNode } from "react";

// A large muted icon and a friendly line, used wherever a list or section
// would otherwise just be blank. `icon` is a rendered node (not a
// component reference), matching the pattern used for PageHeader's icon.
export default function EmptyState({
  icon,
  message,
}: {
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-card py-10 text-center">
      <span className="text-nav-inactive">{icon}</span>
      <p className="max-w-[220px] text-sm text-text-muted">{message}</p>
    </div>
  );
}

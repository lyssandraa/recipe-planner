// Month helpers for the shopping tracker, mirroring lib/week.ts's approach:
// a month is addressed by its first-of-month local date, keyed as a plain
// "YYYY-MM" string in URLs rather than anything that goes through UTC, so
// it can't shift to a different calendar month depending on server timezone.

export function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function formatMonthLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function parseMonthParam(param: string): Date {
  const [y, m] = param.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function formatMonthParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

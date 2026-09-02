// Week-of-dates helpers for the planner. Weeks run Monday to Sunday and are
// keyed by that Monday's date, normalised to local midnight so the same
// calendar week always maps to the same MealPlan.startDate regardless of
// what time of day it's requested.

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startStr = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: sameMonth ? undefined : "short" });
  const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${startStr} to ${endStr}`;
}

// A week is addressed in URLs and as a MealPlan.startDate key by its plain
// "YYYY-MM-DD" local calendar date, never a full ISO timestamp, since
// converting through UTC (e.g. Date#toISOString) can shift which calendar
// day it lands on depending on the server's timezone offset.
export function parseWeekStartParam(param: string): Date {
  const [y, m, d] = param.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatWeekStartParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatCookedAgo(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "cooked today";
  if (diffDays === 1) return "cooked yesterday";
  if (diffDays < 7) return `cooked ${diffDays} days ago`;
  if (diffDays < 14) return "cooked last week";
  if (diffDays < 30) return `cooked ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "cooked last month";

  const months = Math.floor(diffDays / 30);
  if (months < 12) return `cooked ${months} months ago`;

  const years = Math.floor(diffDays / 365);
  return years <= 1 ? "cooked a year ago" : `cooked ${years} years ago`;
}

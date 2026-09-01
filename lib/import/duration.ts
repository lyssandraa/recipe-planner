// Parses an ISO 8601 duration (e.g. "PT1H30M") to whole minutes.
// Only the date/time components a recipe would plausibly use are handled.
const ISO_DURATION_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

export function parseIsoDurationToMinutes(iso: string): number | null {
  const match = ISO_DURATION_RE.exec(iso.trim());
  if (!match) return null;

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);

  const total = days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
  return total > 0 ? total : null;
}

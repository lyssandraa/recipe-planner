// Maps Open Food Facts country tag slugs (e.g. "united-kingdom", from a
// "en:united-kingdom" tag) to ISO 3166-1 alpha-2 codes, so a flag emoji can
// be derived from the code rather than guessed from free text. Easy to
// extend: add a slug/code pair as new countries show up in scanned
// products.
export const COUNTRY_SLUG_TO_ISO: Record<string, string> = {
  "united-kingdom": "GB",
  ireland: "IE",
  france: "FR",
  germany: "DE",
  italy: "IT",
  spain: "ES",
  netherlands: "NL",
  belgium: "BE",
  poland: "PL",
  portugal: "PT",
  greece: "GR",
  "united-states": "US",
  china: "CN",
  india: "IN",
  thailand: "TH",
  mexico: "MX",
  brazil: "BR",
  turkey: "TR",
  morocco: "MA",
  "south-africa": "ZA",
  "new-zealand": "NZ",
  australia: "AU",
  canada: "CA",
  denmark: "DK",
  sweden: "SE",
  switzerland: "CH",
  austria: "AT",
  japan: "JP",
  vietnam: "VN",
  indonesia: "ID",
  peru: "PE",
  colombia: "CO",
  ecuador: "EC",
  "sri-lanka": "LK",
  kenya: "KE",
  egypt: "EG",
  israel: "IL",
  argentina: "AR",
  chile: "CL",
  bulgaria: "BG",
  "czech-republic": "CZ",
  hungary: "HU",
  romania: "RO",
  slovenia: "SI",
};

const REGIONAL_INDICATOR_OFFSET = 127397;

// Offsets each letter of a two-letter ISO code into the Unicode regional
// indicator symbol range (U+1F1E6 "A" ... U+1F1FF "Z"), which browsers
// render as a single flag emoji when two are placed next to each other.
export function isoToFlagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + c.charCodeAt(0)))
    .join("");
}

// "united-kingdom" -> "United Kingdom"
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type CountryDisplay = {
  label: string;
  flag: string | null;
  otherCount: number;
};

// One entry from a stored origin field: a comma-separated list of either
// Open Food Facts tag slugs with any "xx:" language prefix stripped (e.g.
// "united-states,mexico", written that way by lib/openFoodFacts.ts when
// tags are available) or free text (a manual entry, or OFF's own free-text
// field when it had no tags for this product, e.g. "USA, Mexico"). Either
// way, each part is tried against the slug table first (after normalising
// to slug shape) so a flag still resolves when the part happens to be a
// known country regardless of which form it arrived in; a part that
// doesn't match anything recognised is still shown, just without a flag.
export function resolveOrigin(stored: string | null): CountryDisplay | null {
  if (!stored || !stored.trim()) return null;

  const parts = stored
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const first = parts[0];
  const slug = first
    .toLowerCase()
    .replace(/^[a-z]{2}:/, "")
    .replace(/\s+/g, "-");
  const iso = COUNTRY_SLUG_TO_ISO[slug] ?? null;

  return {
    label: iso ? slugToName(slug) : first,
    flag: iso ? isoToFlagEmoji(iso) : null,
    otherCount: parts.length - 1,
  };
}

// For a free-typed manual correction, which is prose the user wrote (may
// well contain its own commas, e.g. "US pistachios, packed in Germany")
// rather than a list of country values, so it's never split on commas the
// way resolveOrigin's stored fields are. Shown exactly as typed, with a
// flag added only when the whole thing happens to be just a country name.
export function resolveOverride(text: string | null): { label: string; flag: string | null } | null {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
  const iso = COUNTRY_SLUG_TO_ISO[slug] ?? null;
  return { label: trimmed, flag: iso ? isoToFlagEmoji(iso) : null };
}

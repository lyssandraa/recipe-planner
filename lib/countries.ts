// Maps Open Food Facts country tag slugs (from countries_tags, e.g.
// "en:united-kingdom") to ISO 3166-1 alpha-2 codes, so a flag emoji can be
// derived from the code rather than guessed from free text. Easy to
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

// "en:united-kingdom" -> "United Kingdom"
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type CountryTagInfo = {
  label: string;
  flag: string | null;
};

// A single countries_tags entry, e.g. "en:united-kingdom" or "en:france".
export function getCountryTagInfo(tag: string): CountryTagInfo {
  const slug = tag.replace(/^[a-z]{2}:/, "");
  const iso = COUNTRY_SLUG_TO_ISO[slug] ?? null;
  return {
    label: slugToName(slug),
    flag: iso ? isoToFlagEmoji(iso) : null,
  };
}

export type CountryDisplay = {
  label: string;
  flag: string | null;
  otherCount: number;
};

// countryTags are raw Open Food Facts tags, e.g. ["en:united-kingdom", "en:france"].
// countryOfOrigin is the human-readable fallback (from a manual entry, or
// when a source doesn't provide tags), a comma-separated list of names.
// Returns null when there's genuinely no country data, so the caller can
// say so plainly instead of just omitting the row.
export function getCountryDisplay(
  countryTags: string[] | null,
  countryOfOrigin: string | null
): CountryDisplay | null {
  if (countryTags && countryTags.length > 0) {
    const first = getCountryTagInfo(countryTags[0]);
    return { label: first.label, flag: first.flag, otherCount: countryTags.length - 1 };
  }

  if (countryOfOrigin && countryOfOrigin.trim()) {
    const parts = countryOfOrigin
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return { label: parts[0], flag: null, otherCount: parts.length - 1 };
    }
  }

  return null;
}

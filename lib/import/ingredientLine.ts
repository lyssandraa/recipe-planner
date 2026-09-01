import type { Unit } from "@prisma/client";

// Parses a freeform ingredient line like "2 tbsp olive oil, plus extra to
// serve" into structured fields. Anything it can't confidently pull out is
// left in `name`, and the original raw text is always kept alongside this
// (by the caller) so a bad parse can be fixed by hand.

export type ParsedIngredientLine = {
  quantity: number | null;
  unit: Unit | null;
  name: string;
  note: string | null;
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};
const UNICODE_FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

const UNIT_ALIASES: Record<string, Unit> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbs: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  piece: "piece",
  pieces: "piece",
  pc: "piece",
};

function parseFractionToken(token: string): number | null {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  const fracMatch = /^(\d+)\/(\d+)$/.exec(token);
  if (fracMatch) {
    const den = Number(fracMatch[2]);
    return den !== 0 ? Number(fracMatch[1]) / den : null;
  }
  return null;
}

function extractLeadingQuantity(text: string): { quantity: number | null; rest: string } {
  const trimmed = text.trim();

  // A range like "2-3" or "2 to 3" takes the lower value.
  const rangeMatch = /^(\d+(?:\.\d+)?)\s*(?:-|to)\s*\d+(?:\.\d+)?\s*(.*)$/i.exec(trimmed);
  if (rangeMatch) {
    return { quantity: Number(rangeMatch[1]), rest: rangeMatch[2] };
  }

  // Mixed number, e.g. "1 1/2" or "1 ½".
  const mixedMatch = new RegExp(
    `^(\\d+)\\s+(\\d+\\/\\d+|[${UNICODE_FRACTION_CHARS}])\\s*(.*)$`
  ).exec(trimmed);
  if (mixedMatch) {
    const frac = parseFractionToken(mixedMatch[2]);
    if (frac != null) return { quantity: Number(mixedMatch[1]) + frac, rest: mixedMatch[3] };
  }

  // Attached whole + fraction, e.g. "1½".
  const attachedMatch = new RegExp(`^(\\d+)([${UNICODE_FRACTION_CHARS}])\\s*(.*)$`).exec(
    trimmed
  );
  if (attachedMatch) {
    const frac = parseFractionToken(attachedMatch[2]);
    if (frac != null) return { quantity: Number(attachedMatch[1]) + frac, rest: attachedMatch[3] };
  }

  // Plain fraction, e.g. "1/2".
  const fracOnlyMatch = /^(\d+\/\d+)\s*(.*)$/.exec(trimmed);
  if (fracOnlyMatch) {
    const frac = parseFractionToken(fracOnlyMatch[1]);
    if (frac != null) return { quantity: frac, rest: fracOnlyMatch[2] };
  }

  // Unicode fraction alone, e.g. "½ tsp salt".
  const unicodeOnlyMatch = new RegExp(`^([${UNICODE_FRACTION_CHARS}])\\s*(.*)$`).exec(trimmed);
  if (unicodeOnlyMatch) {
    const frac = parseFractionToken(unicodeOnlyMatch[1]);
    if (frac != null) return { quantity: frac, rest: unicodeOnlyMatch[2] };
  }

  // Plain integer or decimal.
  const numMatch = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(trimmed);
  if (numMatch) {
    return { quantity: Number(numMatch[1]), rest: numMatch[2] };
  }

  return { quantity: null, rest: trimmed };
}

function extractLeadingUnit(text: string): { unit: Unit | null; rest: string } {
  const trimmed = text.trim();
  const match = /^([a-zA-Z]+)\.?(\s+.*)?$/.exec(trimmed);
  if (!match) return { unit: null, rest: trimmed };

  const token = match[1].toLowerCase();
  const unit = UNIT_ALIASES[token];
  if (!unit) return { unit: null, rest: trimmed };

  return { unit, rest: (match[2] ?? "").trim() };
}

function extractNote(text: string): { name: string; note: string | null } {
  const idx = text.indexOf(",");
  if (idx === -1) return { name: text.trim(), note: null };
  return { name: text.slice(0, idx).trim(), note: text.slice(idx + 1).trim() || null };
}

export function parseIngredientLine(raw: string): ParsedIngredientLine {
  const { quantity, rest: afterQty } = extractLeadingQuantity(raw);
  const { unit, rest: afterUnit } =
    quantity != null ? extractLeadingUnit(afterQty) : { unit: null, rest: afterQty };
  const { name, note } = extractNote(afterUnit);

  return { quantity, unit, name: name || raw.trim(), note };
}

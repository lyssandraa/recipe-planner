// Parses a product's ingredients label text into ordered lines, extracting
// E-numbers and declared percentages where confidently present. Anything
// it can't confidently parse is still kept as rawText, unchanged, so it
// can be read (and fixed by hand outside the app) later.

export type ParsedIngredientLine = {
  position: number;
  rawText: string;
  name: string;
  eNumber: string | null;
  percentage: number | null;
  // The category header this line came from, e.g. "Sweeteners" out of
  // "Sweeteners (Sorbitol, Aspartame)". Null for an ordinary ingredient.
  functionLabel: string | null;
};

// Splits on commas at the top nesting level only. A sub-list in brackets,
// e.g. "Vegetable Oil (Palm, Sunflower)", stays one line.
export function splitTopLevelIngredients(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of text) {
    if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);

    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.filter(Boolean);
}

const PERCENT_PATTERN = /\(\s*(\d+(?:\.\d+)?)\s*%\s*\)|(\d+(?:\.\d+)?)\s*%/;
// Only treated as a standalone additive reference when parenthesised or the
// whole line, otherwise a segment like "Vitamin E" would get mangled.
const E_NUMBER_PATTERN = /\(\s*(E\s?-?\d{3,4}[a-eA-E]?)\s*\)|^(E\s?-?\d{3,4}[a-eA-E]?)$/i;

export function parseIngredientLine(segment: string): {
  name: string;
  eNumber: string | null;
  percentage: number | null;
} {
  let working = segment.trim();
  let percentage: number | null = null;
  let eNumber: string | null = null;

  const percentMatch = working.match(PERCENT_PATTERN);
  if (percentMatch) {
    percentage = Number(percentMatch[1] ?? percentMatch[2]);
    working = (
      working.slice(0, percentMatch.index) +
      working.slice(percentMatch.index! + percentMatch[0].length)
    ).trim();
  }

  const eMatch = working.match(E_NUMBER_PATTERN);
  if (eMatch) {
    eNumber = (eMatch[1] ?? eMatch[2]).replace(/\s|-/g, "").toUpperCase();
    working = (
      working.slice(0, eMatch.index) +
      working.slice(eMatch.index! + eMatch[0].length)
    ).trim();
  }

  working = working.replace(/^[,:\-]+|[,:\-]+$/g, "").trim();

  return { name: working || segment.trim(), eNumber, percentage };
}

// Category header words that group real ingredients on a label, e.g.
// "Sweeteners (Sorbitol, Aspartame)". Easy to extend: add a word here.
const FUNCTION_WORDS = [
  "sweetener",
  "sweeteners",
  "humectant",
  "thickener",
  "thickeners",
  "emulsifier",
  "emulsifiers",
  "colour",
  "colours",
  "preservative",
  "preservatives",
  "antioxidant",
  "antioxidants",
  "raising agent",
  "raising agents",
  "acidity regulator",
  "stabiliser",
  "stabilisers",
  "flavouring",
  "flavourings",
  "glazing agent",
  "anti-caking agent",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export type FunctionGroupMatch = {
  // Capitalised display form, e.g. "Sweeteners".
  functionWord: string;
  // Contents of the brackets or text after the colon, or null when the
  // header appears with nothing following it.
  innerText: string | null;
};

// Matches "Sweeteners (Sorbitol, Aspartame)", "Sweeteners: Sorbitol,
// Aspartame", or a bare "Sweeteners" with nothing after it.
export function matchFunctionGroup(segment: string): FunctionGroupMatch | null {
  const trimmed = segment.trim();

  for (const word of FUNCTION_WORDS) {
    if (trimmed.toLowerCase() === word) {
      return { functionWord: capitalize(word), innerText: null };
    }

    const escaped = escapeRegExp(word);

    const bracketMatch = new RegExp(`^${escaped}\\s*\\(([^)]*)\\)\\.?$`, "i").exec(trimmed);
    if (bracketMatch && bracketMatch[1].trim()) {
      return { functionWord: capitalize(word), innerText: bracketMatch[1] };
    }

    const colonMatch = new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "i").exec(trimmed);
    if (colonMatch && colonMatch[1].trim()) {
      return { functionWord: capitalize(word), innerText: colonMatch[1] };
    }
  }

  return null;
}

// Rounds a declared percentage to 1 decimal place and drops a trailing
// ".0", so 55.2 stays "55.2" but 17.0 becomes "17" rather than "17.0".
export function formatPercentage(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

export function parseIngredientsText(rawText: string): ParsedIngredientLine[] {
  const topLevel = splitTopLevelIngredients(rawText);
  const lines: Omit<ParsedIngredientLine, "position">[] = [];

  for (const segment of topLevel) {
    const group = matchFunctionGroup(segment);

    if (group?.innerText) {
      for (const sub of splitTopLevelIngredients(group.innerText)) {
        const { name, eNumber, percentage } = parseIngredientLine(sub);
        lines.push({ rawText: sub, name, eNumber, percentage, functionLabel: group.functionWord });
      }
      continue;
    }

    if (group && !group.innerText) {
      // A bare category header with nothing in brackets. Kept as its own
      // row (rawText equal to functionLabel marks it as function-only for
      // display) rather than dropped, since it's still real label text.
      lines.push({
        rawText: group.functionWord,
        name: group.functionWord,
        eNumber: null,
        percentage: null,
        functionLabel: group.functionWord,
      });
      continue;
    }

    const { name, eNumber, percentage } = parseIngredientLine(segment);
    lines.push({ rawText: segment, name, eNumber, percentage, functionLabel: null });
  }

  return lines.map((line, index) => ({ position: index, ...line }));
}

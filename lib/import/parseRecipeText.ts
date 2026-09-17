// Heuristic recipe parser for plain text with no structured markup to lean
// on (a PDF's extracted text layer, or OCR output). Unlike the JSON-LD
// layer (lib/import/parseRecipe.ts), there's no schema to trust here, just
// section headings and line shape, so this is best-effort: the review
// screen every import lands on either way is what actually catches a bad
// split, not this.
import { parseIngredientLine } from "./ingredientLine";
import type { ParsedRecipeDraft } from "./parseRecipe";

const INGREDIENTS_HEADING = /^ingredients?\s*:?\s*$/i;
const METHOD_HEADING = /^(method|instructions?|directions?|steps?|preparation)\s*:?\s*$/i;
const TRAILING_HEADING = /^(notes?|tips?|nutrition|storage|equipment)\b/i;

// The digit-not-followed-by-another-digit guard matters: without it "0.5
// cup flour" reads as list marker "0." plus "5 cup flour", eating the
// leading zero off a decimal quantity.
const BULLET_OR_NUMBER = /^(\d+[.):](?!\d)|[-•*])\s*/;

function isBulletOrNumbered(line: string): boolean {
  return BULLET_OR_NUMBER.test(line);
}

function stripBulletOrNumber(line: string): string {
  return line.replace(BULLET_OR_NUMBER, "").trim();
}

// Three tiers, most reliable signal first: explicit numbered/bulleted
// steps (merging any unmarked continuation lines into the step above),
// then blank-line-separated paragraphs, then finally just one step per
// non-empty line, the shape a lot of plain print-recipe exports actually
// come out as once their CSS step-counters are gone.
function splitIntoSteps(sectionText: string): string[] {
  const rawLines = sectionText.split(/\r?\n/).map((l) => l.trim());

  const markerSteps: string[] = [];
  let current = "";
  let markerCount = 0;
  for (const line of rawLines) {
    if (!line) continue;
    if (isBulletOrNumbered(line)) {
      if (current) markerSteps.push(current.trim());
      current = stripBulletOrNumber(line);
      markerCount++;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) markerSteps.push(current.trim());
  if (markerCount >= 2) return markerSteps.filter(Boolean);

  const paragraphs = sectionText
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) return paragraphs;

  return rawLines.filter(Boolean);
}

function extractServings(lines: string[]): number | null {
  for (const line of lines) {
    const m = /serv(?:ings|es)?\s*:?\s*(\d+)/i.exec(line);
    if (m) return Number(m[1]);
  }
  return null;
}

function extractTotalTimeMins(lines: string[]): number | null {
  for (const line of lines) {
    const m = /total\s*time\s*:?\s*(\d+)\s*(hour|hr|min)/i.exec(line);
    if (m) return /hour|hr/i.test(m[2]) ? Number(m[1]) * 60 : Number(m[1]);
  }
  return null;
}

export function parseRecipeText(rawText: string, fallbackTitle: string): ParsedRecipeDraft {
  const allLines = rawText.split(/\r?\n/).map((l) => l.trim());
  const nonEmptyLines = allLines.filter(Boolean);

  const title = nonEmptyLines[0]?.slice(0, 200) || fallbackTitle;

  const ingredientsIdx = allLines.findIndex((l) => INGREDIENTS_HEADING.test(l));
  const methodIdx = allLines.findIndex(
    (l, i) => (ingredientsIdx === -1 || i > ingredientsIdx) && METHOD_HEADING.test(l)
  );

  let ingredientLines: string[] = [];
  if (ingredientsIdx !== -1) {
    const end = methodIdx !== -1 ? methodIdx : allLines.length;
    ingredientLines = allLines
      .slice(ingredientsIdx + 1, end)
      .filter(Boolean)
      .map(stripBulletOrNumber);
  }

  let steps: { text: string }[] = [];
  if (methodIdx !== -1) {
    let end = allLines.length;
    for (let i = methodIdx + 1; i < allLines.length; i++) {
      if (allLines[i] && TRAILING_HEADING.test(allLines[i])) {
        end = i;
        break;
      }
    }
    const methodSection = allLines.slice(methodIdx + 1, end).join("\n");
    steps = splitIntoSteps(methodSection).map((text) => ({ text }));
  }

  const headLines = ingredientsIdx !== -1 ? allLines.slice(0, ingredientsIdx) : nonEmptyLines;

  return {
    title,
    description: null,
    servings: extractServings(headLines),
    totalTimeMins: extractTotalTimeMins(headLines),
    activeTimeMins: null,
    imageUrl: null,
    steps,
    ingredients: ingredientLines.map((raw) => ({ raw, ...parseIngredientLine(raw) })),
    sourceUrl: "",
  };
}

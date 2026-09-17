// Heuristic receipt line parser, for OCR output (or any other plain-text
// receipt dump). Most receipts print "NAME .... PRICE" one item per line,
// so this looks for a trailing price on each line and excludes the lines
// that are clearly totals/payment metadata rather than a purchased item.
// Best-effort like the PDF recipe parser: the review screen every scan
// lands on is what actually catches a bad read, not this.

export type ParsedReceiptItem = {
  name: string;
  quantityText: string | null;
  price: number;
};

export type ParsedReceipt = {
  items: ParsedReceiptItem[];
  totalSpent: number | null;
};

// Lines that are payment/tax metadata, not a thing that was bought, even
// though they end in a price just like a real item line does. Not anchored
// to the start: OCR noise routinely prepends garbage characters before the
// actual word ("A CASH GBP" for "CASH GBP"), \b keeps it from matching the
// word as a mid-string substring of something else instead.
const NON_ITEM_LINE =
  /\b(sub-?total|vat|tax|change|cash|card|visa|mastercard|amex|balance|tender|discount|saving|amount due|payment|points|loyalty|rounding|gift card)\b/i;

// Finds the last price-shaped number on the line and treats everything
// before it as the name, discarding whatever follows entirely, rather
// than requiring the tail after the price to cleanly resolve to nothing.
// UK till receipts routinely print a one-letter VAT category (A/B) after
// every price, and OCR on a real photographed receipt adds its own noise
// on top of that (misread margin artifacts, stray characters), of
// unpredictable shape, requiring an exact match on what follows the price
// silently drops entire receipts' worth of otherwise-readable lines.
// \d* not \d+ before the dot: thermal printers commonly drop the leading
// zero on sub-£1 amounts (".80" rather than "0.80").
function extractTrailingPrice(line: string): { name: string; price: number } | null {
  // [.,] not just a literal dot: OCR on a real photo occasionally misreads
  // a decimal point as a comma ("0,95"). Safe to treat as equivalent here,
  // a UK till receipt has no legitimate comma-decimal amount to confuse it
  // with.
  const matches = [...line.matchAll(/[£$]?(\d*)[.,](\d{2})\b/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const name = line.slice(0, last.index).trim();
  return { name, price: Number(`${last[1]}.${last[2]}`) };
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let totalSpent: number | null = null;
  const items: ParsedReceiptItem[] = [];

  for (const line of lines) {
    const parsed = extractTrailingPrice(line);
    if (!parsed || parsed.name.length < 2) continue;

    // Checked before the general exclusion list: \btotal\b doesn't match
    // inside "SUBTOTAL" (no word boundary between "sub" and "total"), so
    // this has to run first regardless, not anchored to the start for the
    // same OCR-noise reason as NON_ITEM_LINE above. The last matching line
    // wins, receipts that break total into subtotal/tax/total usually put
    // the real, final figure last.
    if (/\btotal\b/i.test(parsed.name)) {
      totalSpent = parsed.price;
      continue;
    }
    if (NON_ITEM_LINE.test(parsed.name)) continue;

    items.push({ name: parsed.name, quantityText: null, price: parsed.price });
  }

  return { items, totalSpent };
}

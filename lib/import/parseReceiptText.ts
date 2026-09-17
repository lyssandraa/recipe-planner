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
// though they end in a price just like a real item line does.
const NON_ITEM_LINE =
  /^(sub-?total|vat|tax|change|cash|card|visa|mastercard|amex|balance|tender|discount|saving|amount due|payment|points|loyalty|rounding|gift card)\b/i;

function extractTrailingPrice(line: string): { name: string; price: number } | null {
  // \d* not \d+ before the dot: thermal-printer receipts commonly drop the
  // leading zero on sub-£1 amounts (".80" rather than "0.80").
  const m = /^(.+?)\s+[£$]?(\d*\.\d{2})\s*$/.exec(line.trim());
  if (!m) return null;
  return { name: m[1].trim(), price: Number(m[2]) };
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

    // Checked before the general exclusion list: a plain "total" line
    // doesn't start with "sub", so it's never caught by NON_ITEM_LINE's
    // sub-?total alternative, this has to run first regardless. The last
    // matching line wins, receipts that break total into subtotal/tax/
    // total usually put the real, final figure last.
    if (/^total\b/i.test(parsed.name)) {
      totalSpent = parsed.price;
      continue;
    }
    if (NON_ITEM_LINE.test(parsed.name)) continue;

    items.push({ name: parsed.name, quantityText: null, price: parsed.price });
  }

  return { items, totalSpent };
}

import { extractText, getDocumentProxy } from "unpdf";

// Only handles a PDF with a real embedded text layer (printed from a web
// page, exported from a document editor). A scanned/photographed page
// saved as PDF has no text layer at all and needs OCR instead, which this
// deliberately doesn't attempt, see the import screen's messaging for that.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

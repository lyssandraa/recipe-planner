import os from "node:os";
import { createWorker } from "tesseract.js";

// Free, local, no API key, no per-use cost, unlike an AI vision model.
// Trade-off: noticeably less accurate on thermal-printer receipt text than
// AI vision would be, and on a serverless deploy each cold start re-fetches
// the English language model from Tesseract's CDN (a few seconds), there's
// no bundled copy in this repo. Worth it for "free and works offline-ish",
// not for "always fast" or "never misreads a price".
export async function extractReceiptText(buffer: Buffer): Promise<string> {
  const worker = await createWorker("eng", undefined, { cachePath: os.tmpdir() });
  try {
    // tesseract.js's TS types only list browser image types (ImageLike),
    // but its own Node loadImage explicitly branches on Buffer.isBuffer
    // and handles it directly, this is a real gap in the .d.ts, not a
    // runtime problem.
    const { data } = await worker.recognize(buffer as never);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

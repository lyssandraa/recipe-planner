// Downscales and re-compresses an image client-side before it's ever sent
// to the server. A raw phone camera photo is routinely 3-10MB, well past
// Vercel's hard, non-configurable 4.5MB serverless request body limit (a
// platform-level wall below Next.js's own bodySizeLimit setting, raising
// that alone doesn't help).
//
// 2400px/0.85 chosen by testing against a real photographed receipt, not
// guessed: a long receipt (30+ items down the page) genuinely needs more
// than a squarer photo would to keep each line legible after downscaling,
// 1600px measurably dropped real items an OCR pass at 2400px recovered.
// Still comes out well under a megabyte for a mostly-white, text-heavy
// receipt image, nowhere near any of the size limits above.
export async function compressImageFile(
  file: File,
  maxDimension = 2400,
  quality = 0.85
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;

    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

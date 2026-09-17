// Downscales and re-compresses an image client-side before it's ever sent
// to the server. A raw phone camera photo is routinely 3-10MB, well past
// Vercel's hard, non-configurable 4.5MB serverless request body limit (a
// platform-level wall below Next.js's own bodySizeLimit setting, raising
// that alone doesn't help). Tesseract doesn't need full camera resolution
// either, a receipt is mostly text at a readable size even downscaled, so
// this also makes OCR faster, not just smaller to upload.
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.8
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

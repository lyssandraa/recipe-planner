// Regenerates the PWA icons (public/icon-*.png, apple-touch-icon.png,
// favicons) from scripts/icon-source.svg. Run with `node scripts/generate-icons.mjs`
// after editing the source SVG. Requires the `sharp` package
// (`npm install --no-save sharp` if it isn't already in node_modules).
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("./public", { recursive: true });

const svgPath = "./scripts/icon-source.svg";
const sizes = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/favicon-32.png", 32],
  ["public/favicon-16.png", 16],
];

for (const [out, size] of sizes) {
  await sharp(svgPath).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}

console.log("done");

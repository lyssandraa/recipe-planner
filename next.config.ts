import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Default bottom-left position collides with the bottom nav's Home button.
  devIndicators: {
    position: "top-right",
  },
  // tesseract.js loads its worker script and WASM binary from node_modules
  // at runtime via dynamic paths Next's bundler can't trace statically.
  // Bundling it anyway breaks that lookup once deployed (works in local
  // dev, where the full filesystem is present, not on Vercel's traced
  // serverless output), this opts it out of bundling entirely so Node's
  // native require resolves it normally instead.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;

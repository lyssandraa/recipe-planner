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
  // serverExternalPackages alone wasn't enough: Vercel's automatic file
  // tracer found worker-script/node/index.js (it's referenced as a string
  // when the worker thread is spawned) but couldn't then follow THAT
  // file's own requires (require('..') etc.), since static tracing
  // doesn't recurse into a dynamically-spawned worker script's dependency
  // graph the way it does the main one. Confirmed by inspecting the trace
  // manifest directly: only that one file was ever included. Force-
  // including the whole package is the documented escape hatch for
  // exactly this "tracer misses required files" case.
  outputFileTracingIncludes: {
    "/shopping-list/tracker": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
    ],
  },
  // Default Server Action body limit is 1MB, far smaller than a real
  // phone camera photo. Raising it only helps up to a point though:
  // Vercel's serverless functions have their own hard, non-configurable
  // 4.5MB request body limit below this, so kept under that deliberately
  // (the receipt scanner now compresses the photo client-side first, see
  // lib/compressImage.ts, this is just a graceful backstop, not the fix).
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

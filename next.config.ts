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
  // tracer can't follow requires inside a dynamically-spawned worker
  // thread's own dependency graph the way it does the main code path.
  // Force-including just tesseract.js's own files fixed the first missing
  // module (worker-script/index.js), then the next deploy failed on one
  // of ITS dependencies (bmp-js) instead, not traced either. Blanket-
  // including all of node_modules "fixes" that but is ~1GB, way past
  // Vercel's function size limit, so this is the actual full dependency
  // closure instead (tesseract.js's package.json deps, plus node-fetch's
  // own whatwg-url, tr46 and webidl-conversions), checked by hand so this
  // doesn't need another round of one-missing-module-at-a-time deploys.
  outputFileTracingIncludes: {
    "/shopping-list/tracker": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/bmp-js/**/*",
      "./node_modules/idb-keyval/**/*",
      "./node_modules/is-url/**/*",
      "./node_modules/node-fetch/**/*",
      "./node_modules/opencollective-postinstall/**/*",
      "./node_modules/regenerator-runtime/**/*",
      "./node_modules/wasm-feature-detect/**/*",
      "./node_modules/zlibjs/**/*",
      "./node_modules/whatwg-url/**/*",
      "./node_modules/tr46/**/*",
      "./node_modules/webidl-conversions/**/*",
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Default bottom-left position collides with the bottom nav's Home button.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;

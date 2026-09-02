import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recipe Planner",
    short_name: "Recipes",
    description: "Personal recipe and dinner planning",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF8EE",
    theme_color: "#2F5E3A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

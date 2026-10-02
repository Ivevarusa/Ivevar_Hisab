import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IVEVAR Books",
    short_name: "IVEVAR",
    description: "Orders, payments, purchases, expenses and cash for IVEVAR",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

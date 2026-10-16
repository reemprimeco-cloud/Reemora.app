import type { MetadataRoute } from "next";

// Web App Manifest — makes reemora.app (and the Lounge inside it)
// installable to a phone/desktop home screen with the Reemora icon and
// theme colour. One manifest + one service worker serve the whole site.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reemora",
    short_name: "Reemora",
    description: "Reemora — Build Apps with AI. Courses, the members-only Lounge community, and secure registration.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1730",
    theme_color: "#0b1730",
    lang: "en",
    dir: "auto",
    categories: ["education", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "Reemora Lounge", short_name: "Lounge", url: "/lounge", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Lounge Chat", short_name: "Chat", url: "/lounge/chat", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Courses", short_name: "Courses", url: "/courses", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}

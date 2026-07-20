import type { MetadataRoute } from "next";

// Web App Manifest — makes reemora.app installable to a phone/desktop home
// screen with the R icon, name "Reemora", and a matching theme colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reemora app",
    short_name: "Reemora",
    description: "Reemora — Build Apps with AI. Courses, live cohorts and secure registration.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1730",
    theme_color: "#0b1730",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

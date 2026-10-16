import { NextResponse } from "next/server";

/** A second, admin-only web app manifest. Installing from any /admin page
 *  puts a separate "Reemora Admin" icon on the home screen that opens
 *  straight into the dashboard (instead of the public site's start URL),
 *  and on iOS that installed app is what makes push notifications
 *  possible. The shared service worker at / already covers this scope.
 *
 *  Served without the admin auth gate: browsers fetch manifests without
 *  cookies, and nothing here is private. */
export function GET() {
  const manifest = {
    name: "Reemora Admin",
    short_name: "Admin",
    description: "Reemora back office: registrations, reservations, messages and the Lounge.",
    id: "/admin",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1730",
    theme_color: "#0b1730",
    lang: "en",
    dir: "auto",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Registrations", url: "/admin/registrations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Reservations", url: "/admin/reservations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Lounge Members", url: "/admin/lounge/members", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Settings", url: "/admin/settings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

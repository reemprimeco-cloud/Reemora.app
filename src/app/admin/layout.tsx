import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — Admin — Reemora",
  },
  robots: { index: false, follow: false },
  // Separate installable app for the back office: "Reemora Admin" on the
  // home screen opens /admin directly and can receive admin push alerts.
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Reemora Admin", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

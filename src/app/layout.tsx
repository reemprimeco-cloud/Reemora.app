import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reemora.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Reemora — Build Apps with AI",
    template: "%s — Reemora",
  },
  description:
    "Reemora trains founders, developers and teams to design, build and launch AI-powered applications through hands-on, expert-led courses.",
  keywords: [
    "AI app development",
    "AI training",
    "prompt engineering course",
    "AI agents course",
    "Reemora",
  ],
  openGraph: {
    title: "Reemora — Build Apps with AI",
    description:
      "Hands-on, instructor-led courses that take you from prompt to production.",
    url: siteUrl,
    siteName: "Reemora",
    images: ["/images/logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reemora — Build Apps with AI",
    description:
      "Hands-on, instructor-led courses that take you from prompt to production.",
    images: ["/images/logo.png"],
  },
  // Explicit icons removed — Next.js file conventions (app/icon.svg,
  // app/apple-icon.png, app/manifest.ts) pick this up automatically now.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "Reemora",
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1730",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Reemora",
  url: siteUrl,
  logo: `${siteUrl}/images/logo.png`,
  description:
    "Reemora trains founders, developers and teams to design, build and launch AI-powered applications through hands-on, expert-led courses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${inter.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

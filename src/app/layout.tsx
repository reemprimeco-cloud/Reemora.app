import type { Metadata, Viewport } from "next";
import { Poppins, Inter, Tajawal } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n/context";
import { getLang } from "@/lib/i18n/get-lang";
import { DIR } from "@/lib/i18n/dictionaries";

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

// Arabic-friendly display + body font. Loaded alongside the Latin fonts so
// switching languages on the client is instant (no font swap flash).
const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  const dir = DIR[lang];
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} ${tajawal.variable} antialiased`}
        data-lang={lang}
      >
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
          <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

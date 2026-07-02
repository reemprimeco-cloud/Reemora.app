import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const settings = await getWebsiteSettings();

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-[130px] text-center">
        <h1 className="mb-2.5 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-ink-soft">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="rounded-full border-2 border-transparent bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800">
          Back to Home
        </Link>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Course Not Found",
  robots: { index: false, follow: false },
};

export default async function CourseNotFound() {
  const settings = await getWebsiteSettings();

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-[130px] text-center">
        <h1 className="mb-2.5 text-2xl font-bold">Course not found</h1>
        <p className="mb-6 text-ink-soft">This course may have been removed or the link is incorrect.</p>
        <Link href="/courses" className="rounded-full border-2 border-transparent bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800">
          Back to Course Catalog
        </Link>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

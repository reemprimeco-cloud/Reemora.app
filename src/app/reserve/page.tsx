import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ReserveForm } from "@/components/reserve-form";
import { getCourses } from "@/lib/data/courses";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getLang, getDict } from "@/lib/i18n/get-lang";

export const metadata: Metadata = {
  title: "Reserve Your Seat",
  description: "Tell us who you are and which course you're interested in — no payment collected.",
  alternates: { canonical: "/reserve" },
};

export default async function ReservePage() {
  const lang = await getLang();
  const [courses, settings] = await Promise.all([getCourses(lang), getWebsiteSettings(lang)]);
  const dict = getDict(lang);
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[720px] px-6">
          <Link href="/" className="-my-2.5 mb-2.5 inline-flex min-h-[40px] items-center gap-1.5 py-2.5 text-sm font-semibold text-blue-600 hover:underline">
            <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" /> {dict.reservePage.back}
          </Link>
          <div className="mb-8 text-center">
            <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.reservePage.eyebrow}</span>
            <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">{dict.reservePage.title}</h1>
            <p className="text-ink-soft">{dict.reservePage.subtitle}</p>
          </div>
          <Suspense fallback={null}>
            <ReserveForm courses={courseOptions} />
          </Suspense>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FeedbackForm } from "@/components/feedback-form";
import { getCourses } from "@/lib/data/courses";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getLang, getDict } from "@/lib/i18n/get-lang";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share your feedback about a Reemora course.",
  robots: { index: false, follow: true },
};

export default async function FeedbackPage() {
  const [lang, courses, settings] = await Promise.all([getLang(), getCourses(), getWebsiteSettings()]);
  const dict = getDict(lang);
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[640px] px-6">
          <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">
            {dict.feedbackPage.eyebrow}
          </span>
          <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">{dict.feedbackPage.title}</h1>
          <p className="mb-8.5 text-ink-soft">{dict.feedbackPage.subtitle}</p>
          <FeedbackForm courses={courseOptions} />
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

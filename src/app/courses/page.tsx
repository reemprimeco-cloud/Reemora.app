import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCourses } from "@/lib/data/courses";
import { getWebsiteSettings } from "@/lib/data/settings";
import { CourseCatalog } from "@/components/course-catalog";
import { getLang, getDict } from "@/lib/i18n/get-lang";

export const metadata: Metadata = {
  title: "Course Catalog",
  description:
    "Browse Reemora's full catalog of AI app-development courses, including dates, pricing and details.",
  alternates: { canonical: "/courses" },
};

export const revalidate = 60;

export default async function CoursesPage() {
  const [lang, courses, settings] = await Promise.all([getLang(), getCourses(), getWebsiteSettings()]);
  const dict = getDict(lang);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 px-6 pb-[70px] pt-[150px] text-center text-white">
          <span className="mb-4.5 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-[#cfe0f8]">
            {dict.coursesPage.eyebrow}
          </span>
          <h1 className="mb-3 text-[30px] font-bold text-white sm:text-[46px]">{dict.coursesPage.title}</h1>
          <p className="mx-auto max-w-[560px] text-[#c6d3ea]">
            {dict.coursesPage.subtitle}
          </p>
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <CourseCatalog courses={courses} />
          </div>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

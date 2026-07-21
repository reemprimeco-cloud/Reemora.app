import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCourseBySlug, getCourses } from "@/lib/data/courses";
import { primarySchedule } from "@/lib/course-utils";
import { getWebsiteSettings } from "@/lib/data/settings";
import { RegisterForm } from "@/components/register-form";
import { getLang, getDict } from "@/lib/i18n/get-lang";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export const metadata: Metadata = {
  title: "Register",
  description: "Reserve your seat and complete secure payment via MyFatoorah.",
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;
  const [lang, course, settings] = await Promise.all([getLang(), getCourseBySlug(slug), getWebsiteSettings()]);
  if (!course) notFound();
  const schedule = primarySchedule(course);
  if (!schedule) notFound();
  const dict = getDict(lang);

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[1180px] px-6">
          <Link
            href={course.registration_open ? "/courses" : `/courses/${course.slug}`}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600"
          >
            <ArrowLeft size={15} /> {course.registration_open ? dict.registerPage.back : dict.registerPage.lockedBack}
          </Link>
          {!course.registration_open ? (
            <div className="mx-auto max-w-xl rounded-[22px] border border-border-c bg-surface p-7.5 text-center">
              <h1 className="mb-3 text-[24px] font-bold sm:text-3xl">{dict.registerPage.lockedTitle}</h1>
              <p className="text-ink-soft">{dict.registerPage.lockedBody}</p>
            </div>
          ) : (
            <>
              <div className="mb-10 max-w-xl">
                <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.registerPage.eyebrow}</span>
                <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">{dict.registerPage.title}</h1>
                <p className="text-ink-soft">{dict.registerPage.subtitle}</p>
              </div>
              <Suspense fallback={null}>
                <RegisterForm course={course} schedule={schedule} />
              </Suspense>
            </>
          )}
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

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
  const [course, settings] = await Promise.all([getCourseBySlug(slug), getWebsiteSettings()]);
  if (!course) notFound();
  const schedule = primarySchedule(course);
  if (!schedule) notFound();

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[1180px] px-6">
          <Link href="/courses" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
            <ArrowLeft size={15} /> Back to Course Catalog
          </Link>
          <div className="mb-10 max-w-xl">
            <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Registration</span>
            <h1 className="mb-3 text-[28px] font-bold sm:text-4xl">Reserve your seat</h1>
            <p className="text-ink-soft">Fill in your details below. You&apos;ll be redirected to a secure MyFatoorah payment page to complete your registration.</p>
          </div>
          <Suspense fallback={null}>
            <RegisterForm course={course} schedule={schedule} />
          </Suspense>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

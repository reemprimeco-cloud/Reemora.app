import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InquiryModal } from "@/components/inquiry-modal";
import { WaitlistModal } from "@/components/waitlist-modal";
import { PrivateSessionModal } from "@/components/private-session-modal";
import { CourseGallery } from "@/components/course-gallery";
import { getCourseBySlug, getCourses } from "@/lib/data/courses";
import { courseImageSrc, formatDuration, primarySchedule } from "@/lib/course-utils";
import { getWebsiteSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.short_description,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title: course.title,
      description: course.short_description,
      type: "website",
      images: course.image_url ? [course.image_url] : ["/images/logo.png"],
    },
  };
}

const LEVEL_KEY: Record<string, "beginner" | "intermediate" | "advanced"> = {
  Beginner: "beginner",
  Intermediate: "intermediate",
  Advanced: "advanced",
};

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const [lang, resolvedCourse, settings] = await Promise.all([
    getLang(),
    getCourseBySlug(slug),
    getWebsiteSettings(),
  ]);
  if (!resolvedCourse) notFound();
  const course = resolvedCourse;
  const dict = getDict(lang);

  const image = courseImageSrc(course);
  const schedule = primarySchedule(course);
  const levelKey = LEVEL_KEY[course.level];
  const levelLabel = levelKey ? dict.coursesPage[levelKey] : course.level;

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.short_description,
    provider: {
      "@type": "Organization",
      name: "Reemora",
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || "https://reemora.app",
    },
    ...(schedule && {
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "Onsite",
        startDate: schedule.start_date ?? undefined,
        endDate: schedule.end_date ?? undefined,
      },
    }),
    offers: {
      "@type": "Offer",
      price: course.price,
      priceCurrency: course.currency,
      availability: schedule && schedule.seats_available > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  const durationText = formatDuration(course.duration_days ?? 0, course.duration_hours ?? 0, {
    day: dict.courseCard.day,
    days: dict.courseCard.days,
    hour: dict.courseCard.hour,
    hours: dict.courseCard.hours,
    tba: dict.courseCard.tba,
  });
  const sidebarRows: [string, string][] = [
    [dict.courseDetail.instructor, course.instructor?.full_name ?? dict.courseDetail.defaultInstructor],
    [dict.courseDetail.duration, durationText],
    [dict.courseDetail.startDate, formatDate(schedule?.start_date, lang)],
    [dict.courseDetail.endDate, formatDate(schedule?.end_date, lang)],
    [dict.courseDetail.sessions, schedule?.session_days ?? dict.courseDetail.tba],
    [dict.courseDetail.time, schedule?.session_time ?? dict.courseDetail.tba],
    ...(schedule?.location ? ([[dict.courseDetail.location, schedule.location]] as [string, string][]) : []),
    [
      dict.courseDetail.seatsLeft,
      schedule
        ? interpolate(dict.courseDetail.seatsLeftValue, { available: schedule.seats_available, total: schedule.seats_total })
        : dict.courseDetail.tba,
    ],
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[1180px] px-6">
          <Link href="/courses" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
            <ArrowLeft size={15} /> {dict.courseDetail.back}
          </Link>
          <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <CourseGallery
                images={[image, ...(course.gallery_images ?? []).filter((g) => g && g !== image)]}
                alt={course.title}
              />
              <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">
                {course.category?.name ?? dict.courseDetail.categoryFallback} · {levelLabel}
              </span>
              <h1 className="mb-4 text-[32px] font-bold sm:text-[38px]">{course.title}</h1>
              <p className="mb-8.5 text-[16.5px] text-ink-soft">{course.description}</p>

              <h2 className="mb-3.5 text-lg font-bold">{dict.courseDetail.whatYoullLearn}</h2>
              <ul className="mb-5">
                {course.curriculum.map((item, i) => (
                  <li key={item} className="flex items-center gap-3 border-b border-border-c py-3 text-[14.5px] last:border-none">
                    <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sticky top-[100px] rounded-[22px] border border-border-c bg-surface p-7.5 shadow-sm">
              <h2 className="mb-4.5 text-2xl font-bold">{formatMoney(course.price, course.currency)}</h2>
              {sidebarRows.map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border-c py-3 text-sm last:border-none">
                  <span className="text-ink-soft">{label}</span>
                  <span className="font-bold text-foreground">{value}</span>
                </div>
              ))}
              {!course.registration_open ? (
                <div
                  role="note"
                  className="mt-5.5 rounded-xl border border-border-c bg-surface-alt px-4 py-3.5 text-center text-sm font-semibold text-ink-soft"
                >
                  {dict.courseDetail.registrationLocked}
                  <p className="mt-1 text-xs font-normal text-ink-soft">{dict.courseDetail.registrationLockedHint}</p>
                </div>
              ) : schedule && schedule.seats_available > 0 ? (
                <Link
                  href={`/register/${course.slug}`}
                  className="mt-5.5 block w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-center text-[15px] font-semibold text-white transition hover:bg-navy-800"
                >
                  {dict.courseDetail.register}
                </Link>
              ) : (
                <WaitlistModal courseId={course.id} courseScheduleId={schedule?.id ?? null} courseTitle={course.title} />
              )}
              <div className="mt-3">
                <InquiryModal courseId={course.id} courseScheduleId={schedule?.id ?? null} courseTitle={course.title} />
              </div>
              <div className="mt-3">
                <PrivateSessionModal courseId={course.id} courseTitle={course.title} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

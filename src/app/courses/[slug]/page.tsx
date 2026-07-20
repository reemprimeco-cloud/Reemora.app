import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InquiryModal } from "@/components/inquiry-modal";
import { getCourseBySlug, getCourses } from "@/lib/data/courses";
import { courseImageSrc, primarySchedule } from "@/lib/course-utils";
import { getWebsiteSettings } from "@/lib/data/settings";
import { formatDate, formatMoney } from "@/lib/utils";

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

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const [course, settings] = await Promise.all([getCourseBySlug(slug), getWebsiteSettings()]);
  if (!course) notFound();

  const image = courseImageSrc(course);
  const schedule = primarySchedule(course);

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
            <ArrowLeft size={15} /> Back to Course Catalog
          </Link>
          <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="relative mb-7.5 aspect-video overflow-hidden rounded-[22px] shadow-lg">
                <Image src={image} alt={course.title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
              </div>
              <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">
                {course.category?.name ?? "Course"} · {course.level}
              </span>
              <h1 className="mb-4 text-[32px] font-bold sm:text-[38px]">{course.title}</h1>
              <p className="mb-8.5 text-[16.5px] text-ink-soft">{course.description}</p>

              <h2 className="mb-3.5 text-lg font-bold">What you&apos;ll learn</h2>
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
              {[
                ["Instructor", course.instructor?.full_name ?? "Reemora Certified Trainer"],
                ["Duration", `${course.duration_weeks} weeks`],
                ["Start Date", formatDate(schedule?.start_date)],
                ["End Date", formatDate(schedule?.end_date)],
                ["Sessions", schedule?.session_days ?? "TBA"],
                ["Time", schedule?.session_time ?? "TBA"],
                ["Seats Left", schedule ? `${schedule.seats_available} / ${schedule.seats_total}` : "TBA"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border-c py-3 text-sm last:border-none">
                  <span className="text-ink-soft">{label}</span>
                  <span className="font-bold text-foreground">{value}</span>
                </div>
              ))}
              <Link
                href={`/register/${course.slug}`}
                className="mt-5.5 block w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-center text-[15px] font-semibold text-white transition hover:bg-navy-800"
              >
                {schedule && schedule.seats_available > 0 ? "Register for This Course" : "Join Waitlist"}
              </Link>
              <div className="mt-3">
                <InquiryModal courseId={course.id} courseScheduleId={schedule?.id ?? null} courseTitle={course.title} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

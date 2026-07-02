import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCourseBySlug, getCourses } from "@/lib/data/courses";
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
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const image = course.image_url || `/images/courses/${course.slug}.svg`;

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[1180px] px-6">
          <Link href="/courses" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
            <ArrowLeft size={15} /> Back to Course Catalog
          </Link>
          <div className="grid grid-cols-1 items-start gap-11 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <div className="relative mb-7.5 aspect-video overflow-hidden rounded-[22px] shadow-lg">
                <Image src={image} alt={course.title} fill className="object-cover" />
              </div>
              <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">
                {course.category} · {course.level}
              </span>
              <h1 className="mb-4 text-[32px] font-bold sm:text-[38px]">{course.title}</h1>
              <p className="mb-8.5 text-[16.5px] text-ink-soft">{course.description}</p>

              <h3 className="mb-3.5 text-lg font-bold">What you&apos;ll learn</h3>
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
              <h3 className="mb-4.5 text-2xl font-bold">{formatMoney(course.price, course.currency)}</h3>
              {[
                ["Instructor", course.instructor],
                ["Duration", `${course.duration_weeks} weeks`],
                ["Start Date", formatDate(course.start_date)],
                ["End Date", formatDate(course.end_date)],
                ["Sessions", course.session_days ?? "TBA"],
                ["Time", course.session_time ?? "TBA"],
                ["Seats Left", `${course.seats_available} / ${course.seats_total}`],
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
                {course.seats_available > 0 ? "Register for This Course" : "Join Waitlist"}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

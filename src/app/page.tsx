import Link from "next/link";
import Image from "next/image";
import { Layers, Rocket, Award, CalendarClock, GraduationCap } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSlider } from "@/components/hero-slider";
import { TestimonialSlider } from "@/components/testimonial-slider";
import { CourseCard } from "@/components/course-card";
import { Reveal } from "@/components/reveal";
import { getCourses } from "@/lib/data/courses";
import { getLeadInstructor } from "@/lib/data/instructors";
import { getTestimonials } from "@/lib/data/testimonials";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getPortfolioItems } from "@/lib/data/portfolio";
import { PortfolioCard } from "@/components/portfolio-card";
import type { TimelineEntry } from "@/lib/types";

const FEATURES = [
  { icon: Layers, title: "AI-Powered Curriculum", desc: "Courses are continuously updated to reflect the latest AI tools, models and best practices." },
  { icon: Rocket, title: "Hands-on Projects", desc: "Every module ends with a real deliverable — you leave with a working app, not just notes." },
  { icon: Award, title: "Certified Trainer", desc: "Learn directly from an internationally certified trainer with real product-building experience." },
  { icon: CalendarClock, title: "Flexible Scheduling", desc: "Evening, weekend and cohort-based options so training fits around your life." },
];

const STATS = [
  { value: "500+", label: "Students Trained" },
  { value: "4+", label: "AI Courses" },
  { value: "10+", label: "Years Training Experience" },
  { value: "98%", label: "Satisfaction Rate" },
];

const DEFAULT_TIMELINE: TimelineEntry[] = [
  { date: "2024 — Present", title: "Founder & Lead Trainer, Reemora", desc: "Designing and delivering AI app-development courses for founders, developers and teams." },
  { date: "International Certification", title: "Certified Professional Trainer", desc: "Certified under an internationally recognized training and instructional design standard." },
  { date: "Prior Experience", title: "AI & Software Product Development", desc: "Years of hands-on experience building and shipping software and AI-powered products." },
];
const DEFAULT_SKILLS = ["AI App Development", "Prompt Engineering", "Curriculum Design", "Public Speaking", "Product Strategy"];

// Revalidate the homepage's cached data every 60s so admin-panel edits
// (portfolio, testimonials, courses, settings) surface within a minute
// without a manual redeploy. Static shell + fresh data on each cache miss.
export const revalidate = 60;

export default async function HomePage() {
  const [courses, instructor, testimonials, settings, portfolio] = await Promise.all([
    getCourses(),
    getLeadInstructor(),
    getTestimonials(),
    getWebsiteSettings(),
    getPortfolioItems(),
  ]);
  const featuredCourses = courses.slice(0, 3);
  // The instructor's timeline/skills are editable via /admin/trainer once
  // they exist in the DB. Fall back to the defaults above when the
  // instructor row hasn't set them yet (fresh install, or admin hasn't
  // customized them).
  const rawTimeline = (instructor as { timeline?: unknown } | null)?.timeline;
  const timeline: TimelineEntry[] = Array.isArray(rawTimeline) && rawTimeline.length > 0
    ? (rawTimeline as TimelineEntry[])
    : DEFAULT_TIMELINE;
  const rawSkills = (instructor as { skills?: unknown } | null)?.skills;
  const skills: string[] = Array.isArray(rawSkills) && rawSkills.length > 0
    ? (rawSkills as string[])
    : DEFAULT_SKILLS;

  return (
    <>
      <SiteHeader />
      <main>
        <HeroSlider />

        <div className="bg-navy-800">
          <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center text-white">
                <strong className="block font-[family-name:var(--font-head)] text-[28px] text-blue-400 sm:text-4xl">{s.value}</strong>
                <span className="text-[13.5px] text-[#b7c5e0]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Why Reemora</span>
              <h2 className="mb-3.5 text-[28px] font-bold sm:text-4xl">A modern approach to learning AI app development</h2>
              <p className="text-[17px] text-ink-soft">Every course is built around one goal: helping you ship a real, working application — not just collect theory.</p>
            </Reveal>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 100}>
                  <div className="h-full rounded-2xl border border-border-c bg-surface p-7 transition-all hover:-translate-y-1.5 hover:shadow-lg">
                    <div className="mb-4.5 flex h-13 w-13 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                      <f.icon size={22} />
                    </div>
                    <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                    <p className="text-[14.5px] text-ink-soft">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface-alt py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Upcoming Courses</span>
              <h2 className="mb-3.5 text-[28px] font-bold sm:text-4xl">Pick your path into AI app building</h2>
              <p className="text-[17px] text-ink-soft">A snapshot of what&apos;s open for registration right now. Browse the full catalog for dates, pricing and details.</p>
            </Reveal>
            {featuredCourses.length ? (
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {featuredCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            ) : (
              <p className="text-center text-ink-soft">No courses published yet — check back soon.</p>
            )}
            <div className="mt-11 text-center">
              <Link href="/courses" className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-navy-800 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600">
                View Full Course Catalog
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="py-24">
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal className="relative mx-auto max-w-[340px] lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-gradient-to-br from-navy-800 to-blue-600 shadow-xl">
                {instructor?.photo_url ? (
                  <Image
                    src={instructor.photo_url}
                    alt={instructor.full_name}
                    fill
                    sizes="(max-width: 1024px) 340px, 420px"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8 text-center text-white">
                    <div>
                      <div className="mb-3.5 text-5xl">★</div>
                      {instructor?.full_name ?? "Trainer photo"}
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4.5 -right-4.5 rounded-2xl bg-surface px-5 py-4 text-center shadow-lg">
                <strong className="block font-[family-name:var(--font-head)] text-[22px] text-blue-600">{instructor?.years_experience ?? 10}+</strong>
                <span className="text-xs text-ink-soft">Years Experience</span>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <span className="mb-2 block text-[15px] font-bold uppercase tracking-wide text-blue-600">About Your Trainer</span>
              <h2 className="mb-4.5 text-[28px] font-bold sm:text-4xl">{instructor?.title ?? "Founder & Lead Trainer"} at {settings.site_name}</h2>
              <p className="mb-6.5 text-ink-soft">{instructor?.bio}</p>

              <div className="mb-7 flex flex-col gap-4.5">
                {timeline.map((item, idx) => (
                  <div key={`${item.title}-${idx}`} className="flex gap-4">
                    <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-blue-500 shadow-[0_0_0_4px_var(--color-blue-100)]" />
                    <div>
                      <span className="text-xs font-bold text-blue-600">{item.date}</span>
                      <h3 className="text-[15.5px] font-bold">{item.title}</h3>
                      <p className="text-sm text-ink-soft">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {skills.map((s) => (
                  <span key={s} className="rounded-full bg-blue-100 px-3.5 py-1.5 text-[12.5px] font-bold text-blue-600">{s}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="certificates" className="bg-surface-alt py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Credentials</span>
              <h2 className="mb-3.5 text-[28px] font-bold sm:text-4xl">International Certified Trainer</h2>
              <p className="text-[17px] text-ink-soft">Certifications and credentials that back the training methodology behind every {settings.site_name} course.</p>
            </Reveal>
            {instructor && instructor.certificates.length ? (
              <div className="grid grid-cols-1 gap-6.5 sm:grid-cols-2 lg:grid-cols-3">
                {instructor.certificates.map((cert, i) => (
                  <Reveal key={cert.id} delay={i * 100}>
                    <div className="overflow-hidden rounded-2xl border border-border-c bg-surface transition-all hover:-translate-y-1.5 hover:shadow-lg">
                      <div className="relative flex aspect-[4/3] items-center justify-center border-b border-border-c bg-gradient-to-br from-blue-100 to-surface text-blue-500">
                        {cert.image_url ? (
                          <Image src={cert.image_url} alt={cert.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                        ) : (
                          <GraduationCap size={40} />
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="mb-1 text-[15.5px] font-bold">{cert.title}</h3>
                        <span className="text-[12.5px] text-ink-soft">{cert.issuing_body || "Placeholder — replace with certificate image"}</span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-center text-ink-soft">No certificates published yet.</p>
            )}
            <p className="mt-6.5 text-center text-[12.5px] text-ink-soft">
              Manage these from the admin panel. Upload real certificate images and update titles/issuing bodies there.
            </p>
          </div>
        </section>

        {testimonials.length > 0 && (
          <section className="py-24">
            <div className="mx-auto max-w-[1180px] px-6">
              <Reveal className="mx-auto mb-13 max-w-xl text-center">
                <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Student Voices</span>
                <h2 className="text-[28px] font-bold sm:text-4xl">What our students say</h2>
              </Reveal>
              <TestimonialSlider testimonials={testimonials} />
            </div>
          </section>
        )}

        {portfolio.length > 0 && (
          <section id="portfolio" className="bg-surface-alt py-24">
            <div className="mx-auto max-w-[1180px] px-6">
              <Reveal className="mx-auto mb-13 max-w-xl text-center">
                <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">Featured Projects</span>
                <h2 className="mb-4 text-[28px] font-bold sm:text-4xl">Products we&apos;ve built</h2>
                <p className="text-ink-soft">A selection of live products designed, built and shipped end-to-end.</p>
              </Reveal>
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.map((item) => (
                  <PortfolioCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="pb-24">
          <Reveal className="mx-auto max-w-[1180px] px-6">
            <div className="rounded-[22px] bg-gradient-to-br from-blue-600 to-navy-800 px-8 py-14 text-center text-white sm:px-16">
              <h2 className="mb-3 text-[28px] font-bold text-white sm:text-4xl">Ready to build your first AI app?</h2>
              <p className="mb-7.5 text-[#d7e2f4]">Browse upcoming cohorts and reserve your seat — registration takes less than five minutes.</p>
              <div className="flex flex-wrap justify-center gap-3.5">
                <Link href="/courses" className="inline-flex items-center justify-center rounded-full border-2 border-white px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-navy-800">
                  Browse Courses
                </Link>
                <Link href="/courses" className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-white px-7 py-3.5 text-[15px] font-semibold text-navy-800 transition hover:-translate-y-0.5">
                  Register Now
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

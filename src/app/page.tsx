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
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";

// Revalidate the homepage's cached data every 60s so admin-panel edits
// (portfolio, testimonials, courses, settings) surface within a minute
// without a manual redeploy. Static shell + fresh data on each cache miss.
// Note: calling cookies() in getLang() forces per-request rendering, so the
// language toggle takes effect immediately — the 60s ISR window still
// applies to the data fetches below via Next's fetch cache.
export const revalidate = 60;

export default async function HomePage() {
  const [lang, courses, instructor, testimonials, settings, portfolio] = await Promise.all([
    getLang(),
    getCourses(),
    getLeadInstructor(),
    getTestimonials(),
    getWebsiteSettings(),
    getPortfolioItems(),
  ]);
  const dict = getDict(lang);
  const featuredCourses = courses.slice(0, 3);

  const FEATURES = [
    { icon: Layers, title: dict.features.curriculum.title, desc: dict.features.curriculum.desc },
    { icon: Rocket, title: dict.features.projects.title, desc: dict.features.projects.desc },
    { icon: Award, title: dict.features.trainer.title, desc: dict.features.trainer.desc },
    { icon: CalendarClock, title: dict.features.scheduling.title, desc: dict.features.scheduling.desc },
  ];

  const STATS = [
    { value: "500+", label: dict.stats.students },
    { value: "4+", label: dict.stats.aiCourses },
    { value: "10+", label: dict.stats.yearsExperience },
    { value: "98%", label: dict.stats.satisfaction },
  ];

  // The instructor's timeline/skills are editable via /admin/trainer once
  // they exist in the DB. Fall back to the localized defaults when the
  // instructor row hasn't set them yet.
  const rawTimeline = (instructor as { timeline?: unknown } | null)?.timeline;
  const timeline: TimelineEntry[] = Array.isArray(rawTimeline) && rawTimeline.length > 0
    ? (rawTimeline as TimelineEntry[])
    : (dict.about.defaultTimeline as unknown as TimelineEntry[]);
  const rawSkills = (instructor as { skills?: unknown } | null)?.skills;
  const skills: string[] = Array.isArray(rawSkills) && rawSkills.length > 0
    ? (rawSkills as string[])
    : (dict.about.defaultSkills as unknown as string[]);

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

        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.features.eyebrow}</span>
              <h2 className="mb-3.5 text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">{dict.features.title}</h2>
              <p className="text-[15px] text-ink-soft sm:text-[17px]">{dict.features.subtitle}</p>
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

        <section className="bg-surface-alt py-16 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.upcoming.eyebrow}</span>
              <h2 className="mb-3.5 text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">{dict.upcoming.title}</h2>
              <p className="text-[17px] text-ink-soft">{dict.upcoming.subtitle}</p>
            </Reveal>
            {featuredCourses.length ? (
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {featuredCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            ) : (
              <p className="text-center text-ink-soft">{dict.upcoming.empty}</p>
            )}
            <div className="mt-11 text-center">
              <Link href="/courses" className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-navy-800 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-600">
                {dict.upcoming.viewCatalog}
              </Link>
            </div>
          </div>
        </section>

        <section id="about" className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-5 sm:gap-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal className="relative mx-auto w-full max-w-[260px] sm:max-w-[340px] lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-gradient-to-br from-navy-800 to-blue-600 shadow-xl">
                {instructor?.photo_url ? (
                  <Image
                    src={instructor.photo_url}
                    alt={instructor.full_name}
                    fill
                    sizes="(max-width: 640px) 260px, (max-width: 1024px) 340px, 420px"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8 text-center text-white">
                    <div>
                      <div className="mb-3.5 text-5xl">★</div>
                      {instructor?.full_name ?? dict.about.trainerPhoto}
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-2xl bg-surface px-4 py-3 text-center shadow-lg sm:-bottom-4.5 sm:-right-4.5 sm:px-5 sm:py-4">
                <strong className="block font-[family-name:var(--font-head)] text-[20px] text-blue-600 sm:text-[22px]">{instructor?.years_experience ?? 10}+</strong>
                <span className="text-[11px] text-ink-soft sm:text-xs">{dict.about.yearsExperience}</span>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <span className="mb-2 block text-[13px] font-bold uppercase tracking-wide text-blue-600 sm:text-[15px]">{dict.about.eyebrow}</span>
              <h2 className="mb-2 text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">
                {instructor?.full_name ?? dict.about.trainerPhoto}
              </h2>
              <p className="mb-5 text-[15px] font-semibold text-blue-600 sm:text-[17px]">
                {interpolate(dict.about.titleTemplate, {
                  title: instructor?.title ?? dict.about.defaultTitle,
                  siteName: settings.site_name,
                })}
              </p>
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft sm:mb-6.5 sm:text-base">{instructor?.bio}</p>

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

        <section id="certificates" className="bg-surface-alt py-16 sm:py-24">
          <div className="mx-auto max-w-[1180px] px-6">
            <Reveal className="mx-auto mb-13 max-w-xl text-center">
              <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.certificates.eyebrow}</span>
              <h2 className="mb-3.5 text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">{dict.certificates.title}</h2>
              <p className="text-[17px] text-ink-soft">{interpolate(dict.certificates.subtitleTemplate, { siteName: settings.site_name })}</p>
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
                        <span className="text-[12.5px] text-ink-soft">{cert.issuing_body || dict.certificates.placeholder}</span>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="text-center text-ink-soft">{dict.certificates.empty}</p>
            )}
            <p className="mt-6.5 text-center text-[12.5px] text-ink-soft">
              {dict.certificates.adminHelp}
            </p>
          </div>
        </section>

        {testimonials.length > 0 && (
          <section className="py-16 sm:py-24">
            <div className="mx-auto max-w-[1180px] px-6">
              <Reveal className="mx-auto mb-13 max-w-xl text-center">
                <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.testimonials.eyebrow}</span>
                <h2 className="text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">{dict.testimonials.title}</h2>
              </Reveal>
              <TestimonialSlider testimonials={testimonials} />
            </div>
          </section>
        )}

        {portfolio.length > 0 && (
          <section id="portfolio" className="bg-surface-alt py-16 sm:py-24">
            <div className="mx-auto max-w-[1180px] px-6">
              <Reveal className="mx-auto mb-13 max-w-xl text-center">
                <span className="mb-4.5 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{dict.portfolio.eyebrow}</span>
                <h2 className="mb-4 text-[24px] font-bold leading-tight sm:text-3xl md:text-4xl">{dict.portfolio.title}</h2>
                <p className="text-ink-soft">{dict.portfolio.subtitle}</p>
              </Reveal>
              <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {portfolio.map((item) => (
                  <PortfolioCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="pb-16 sm:pb-24">
          <Reveal className="mx-auto max-w-[1180px] px-5 sm:px-6">
            <div className="rounded-[22px] bg-gradient-to-br from-blue-600 to-navy-800 px-6 py-10 text-center text-white sm:px-16 sm:py-14">
              <h2 className="mb-3 text-[24px] font-bold leading-tight text-white sm:text-3xl md:text-4xl">{dict.cta.title}</h2>
              <p className="mb-6 text-[15px] text-[#d7e2f4] sm:mb-7.5 sm:text-base">{dict.cta.subtitle}</p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-3.5">
                <Link href="/courses" className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-white px-7 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:-translate-y-0.5 hover:bg-white hover:text-navy-800">
                  {dict.cta.browse}
                </Link>
                <Link href="/courses" className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-transparent bg-white px-7 py-3.5 text-[15px] font-semibold text-navy-800 transition active:scale-[0.98] hover:-translate-y-0.5">
                  {dict.cta.register}
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

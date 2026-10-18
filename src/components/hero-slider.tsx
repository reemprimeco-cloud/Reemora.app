"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

/** Card media per slide. `video` plays muted on a loop, showing `poster`
 *  (its first frame) while it loads; if there is no video or it fails to
 *  load, the poster (or the `image` illustration) is shown instead. Files live in
 *  /public/videos as 960x720 H.264 without audio. */
const MEDIA: { image: string; video: string | null; poster: string | null }[] = [
  { image: "/images/courses/ai-app-bootcamp.svg", video: "/videos/hero-app-bootcamp.mp4", poster: "/videos/hero-app-bootcamp.jpg" },
  { image: "/images/courses/ai-agents.svg", video: "/videos/hero-ai-agents.mp4", poster: "/videos/hero-ai-agents.jpg" },
  { image: "/images/courses/prompt-engineering.svg", video: "/videos/hero-prompt-engineering.mp4", poster: "/videos/hero-prompt-engineering.jpg" },
];

function HeroMedia({ image, video, poster, title }: { image: string; video: string | null; poster: string | null; title: string }) {
  const [failed, setFailed] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    setReduced(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  }, []);
  if (!video || failed) {
    return <Image src={poster ?? image} alt={title} fill priority sizes="(max-width: 768px) 92vw, 40vw" className="object-cover" />;
  }
  return (
    <video
      key={video}
      src={video}
      poster={poster ?? image}
      autoPlay={!reduced}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={title}
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export function HeroSlider({
  coursesCount = "4+",
  studentsCount = "500+",
}: {
  coursesCount?: string;
  studentsCount?: string;
}) {
  const [current, setCurrent] = React.useState(0);
  // Which hero layout is on screen, so only that copy of the slide video is
  // mounted and downloaded. Unknown during server render: both stay in the
  // markup (CSS hides one) until the first client render settles it.
  const [isDesktop, setIsDesktop] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const { dict } = useLanguage();

  const slides = React.useMemo(() => {
    const { slide1, slide2, slide3 } = dict.hero;
    return [
      {
        ...slide1,
        primaryHref: "/courses",
        secondaryHref: "/#about",
        image: MEDIA[0].image,
        video: MEDIA[0].video,
        poster: MEDIA[0].poster,
        meta: [
          { value: coursesCount, label: slide1.metaA },
          { value: studentsCount, label: slide1.metaB },
          { value: slide1.metaCValue, label: slide1.metaC },
        ],
      },
      {
        ...slide2,
        primaryHref: "/reserve",
        secondaryHref: "/#certificates",
        image: MEDIA[1].image,
        video: MEDIA[1].video,
        poster: MEDIA[1].poster,
        meta: [
          { value: slide2.metaAValue, label: slide2.metaA },
          { value: slide2.metaBValue, label: slide2.metaB },
          { value: slide2.metaCValue, label: slide2.metaC },
        ],
      },
      {
        ...slide3,
        primaryHref: "/courses",
        secondaryHref: "/courses",
        image: MEDIA[2].image,
        video: MEDIA[2].video,
        poster: MEDIA[2].poster,
        meta: [
          { value: slide3.metaAValue, label: slide3.metaA },
          { value: slide3.metaBValue, label: slide3.metaB },
          { value: slide3.metaCValue, label: slide3.metaC },
        ],
      },
    ];
  }, [dict, coursesCount, studentsCount]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 pt-[78px]">
      <div className="animate-float absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-blue-400/35 blur-[60px]" />
      <div className="animate-float absolute -left-16 -bottom-20 h-[300px] w-[300px] rounded-full bg-blue-500/35 blur-[60px] [animation-delay:-6s]" />
      <div className="animate-float absolute left-[60%] top-[40%] h-[220px] w-[220px] rounded-full bg-[#8fb4e6]/35 blur-[60px] [animation-delay:-3s]" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div
          key={current}
          className="animate-fade-in grid grid-cols-1 items-center gap-10 py-10 pb-24 md:grid-cols-[1.1fr_0.9fr] md:text-start text-center"
        >
          <div>
            <span className="mb-4.5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-[#cfe0f8]">
              {slide.eyebrow}
            </span>
            <h1 className="mb-5 text-[34px] font-bold leading-tight text-white sm:text-[46px] lg:text-[58px]">
              {slide.titleA} <em className="not-italic text-blue-400">{slide.titleAccent}</em>{slide.titleB}
            </h1>
            {/* Phones: the slide's video sits right under the headline. */}
            <div className="mx-auto mb-6 w-full max-w-[440px] md:hidden">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-white/20 bg-navy-800 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
                {isDesktop !== true && <HeroMedia image={slide.image} video={slide.video} poster={slide.poster} title={slide.imageTitle} />}
              </div>
              <p className="mt-2.5 text-[13px] font-semibold text-[#cfe0f8]">{slide.imageTitle}</p>
            </div>
            <p className="mx-auto mb-8 max-w-[520px] text-lg text-[#c6d3ea] md:mx-0">
              {slide.description}
            </p>
            <div className="mb-10 flex flex-wrap justify-center gap-3.5 md:justify-start">
              <Link href={slide.primaryHref} className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-navy-800">
                {slide.primaryCta}
              </Link>
              <Link href={slide.secondaryHref} className="inline-flex items-center justify-center rounded-full border-2 border-white px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-navy-800">
                {slide.secondaryCta}
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-7 md:justify-start">
              {slide.meta.map((m) => (
                <div key={m.label}>
                  <strong className="block font-[family-name:var(--font-head)] text-2xl text-white">{m.value}</strong>
                  <span className="text-[13px] text-[#a9bcdc]">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <div className="rounded-[22px] border border-white/20 bg-white/10 p-7 backdrop-blur-sm">
              <div className="relative mb-4.5 aspect-[4/3] w-full overflow-hidden rounded-[14px] bg-blue-100">
                {isDesktop !== false && <HeroMedia image={slide.image} video={slide.video} poster={slide.poster} title={slide.imageTitle} />}
              </div>
              <h4 className="mb-1.5 text-lg font-semibold text-white">{slide.imageTitle}</h4>
              <p className="text-sm text-[#c6d3ea]">{slide.imageDesc}</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-7 z-10 flex justify-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`${dict.hero.goToSlide} ${i + 1}`}
              onClick={() => setCurrent(i)}
              aria-current={i === current ? "true" : undefined}
              className="relative flex h-11 min-w-[28px] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span aria-hidden="true" className={cn("block h-2.5 rounded-full bg-white/35 transition-all", i === current ? "w-7 bg-white" : "w-2.5")} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

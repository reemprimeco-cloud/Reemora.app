"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Slide {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  meta: { value: string; label: string }[];
  image: string;
  imageTitle: string;
  imageDesc: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Reemora Training",
    title: (
      <>
        Build Apps <em className="not-italic text-blue-400">with AI</em>, from idea to launch
      </>
    ),
    description:
      "Hands-on, instructor-led courses that take you from prompt to production. Learn to design, build and ship real AI-powered applications — no matter your starting point.",
    primaryCta: { label: "Explore Courses", href: "/courses" },
    secondaryCta: { label: "Meet Your Trainer", href: "/#about" },
    meta: [
      { value: "4+", label: "AI Courses Live" },
      { value: "500+", label: "Students Trained" },
      { value: "Certified", label: "International Trainer" },
    ],
    image: "/images/courses/ai-app-bootcamp.svg",
    imageTitle: "AI App Development Bootcamp",
    imageDesc: "Design, build and launch your own AI app in 6 weeks.",
  },
  {
    eyebrow: "New Cohort Open",
    title: (
      <>
        Turn your idea into a <em className="not-italic text-blue-400">working AI product</em>
      </>
    ),
    description:
      "Whether you're a developer, founder or complete beginner, Reemora's project-based curriculum gets you building real, working AI applications from day one.",
    primaryCta: { label: "Reserve Your Seat", href: "/courses" },
    secondaryCta: { label: "View Credentials", href: "/#certificates" },
    meta: [
      { value: "1:1", label: "Mentor Support" },
      { value: "100%", label: "Project-Based" },
      { value: "Flexible", label: "Scheduling" },
    ],
    image: "/images/courses/ai-agents.svg",
    imageTitle: "Building AI Agents & Automations",
    imageDesc: "Automate real workflows with autonomous AI agents.",
  },
  {
    eyebrow: "Secure Enrollment",
    title: (
      <>
        Register in minutes, <em className="not-italic text-blue-400">pay securely</em> online
      </>
    ),
    description:
      "Every course comes with a simple registration flow and secure online payment powered by MyFatoorah, so you can lock in your seat in just a few clicks.",
    primaryCta: { label: "See Upcoming Dates", href: "/courses" },
    secondaryCta: { label: "Start Registration", href: "/courses" },
    meta: [
      { value: "Secure", label: "Online Payment" },
      { value: "Instant", label: "Confirmation" },
      { value: "KWD", label: "& Multi-Currency" },
    ],
    image: "/images/courses/prompt-engineering.svg",
    imageTitle: "Prompt Engineering for Developers",
    imageDesc: "Master reliable, production-ready prompting techniques.",
  },
];

export function HeroSlider() {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[current];

  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 pt-[78px]">
      <div className="animate-float absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-blue-400/35 blur-[60px]" />
      <div className="animate-float absolute -left-16 -bottom-20 h-[300px] w-[300px] rounded-full bg-blue-500/35 blur-[60px] [animation-delay:-6s]" />
      <div className="animate-float absolute left-[60%] top-[40%] h-[220px] w-[220px] rounded-full bg-[#8fb4e6]/35 blur-[60px] [animation-delay:-3s]" />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div
          key={current}
          className="animate-fade-up grid grid-cols-1 items-center gap-10 py-10 pb-24 md:grid-cols-[1.1fr_0.9fr] md:text-left text-center"
        >
          <div>
            <span className="mb-4.5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-[#cfe0f8]">
              {slide.eyebrow}
            </span>
            <h1 className="mb-5 text-[34px] font-bold leading-tight text-white sm:text-[46px] lg:text-[58px]">
              {slide.title}
            </h1>
            <p className="mx-auto mb-8 max-w-[520px] text-lg text-[#c6d3ea] md:mx-0">
              {slide.description}
            </p>
            <div className="mb-10 flex flex-wrap justify-center gap-3.5 md:justify-start">
              <Link href={slide.primaryCta.href} className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-navy-800">
                {slide.primaryCta.label}
              </Link>
              <Link href={slide.secondaryCta.href} className="inline-flex items-center justify-center rounded-full border-2 border-white px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-navy-800">
                {slide.secondaryCta.label}
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
                <Image src={slide.image} alt={slide.imageTitle} fill className="object-cover" />
              </div>
              <h4 className="mb-1.5 text-lg font-semibold text-white">{slide.imageTitle}</h4>
              <p className="text-sm text-[#c6d3ea]">{slide.imageDesc}</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-7 z-10 flex justify-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2.5 rounded-full bg-white/35 transition-all",
                i === current ? "w-7 bg-white" : "w-2.5"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

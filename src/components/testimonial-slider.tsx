"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const TESTIMONIALS = [
  {
    quote:
      "I went from zero technical background to launching my own AI-powered app in six weeks. The hands-on approach made all the difference.",
    name: "Sara A.",
    role: "Founder, Early-Stage Startup",
  },
  {
    quote:
      "The prompt engineering course completely changed how our development team ships AI features. Practical, structured, and immediately useful.",
    name: "Faisal M.",
    role: "Software Engineer",
  },
  {
    quote:
      "Best training investment I've made. The trainer's real-world experience shows in every session.",
    name: "Lulwa K.",
    role: "Product Manager",
  },
];

export function TestimonialSlider() {
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % TESTIMONIALS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const t = TESTIMONIALS[current];

  return (
    <div className="mx-auto max-w-[760px] text-center">
      <div key={current} className="animate-fade-up min-h-[140px]">
        <p className="mb-5.5 font-[family-name:var(--font-head)] text-xl font-semibold text-foreground sm:text-[21px]">
          &ldquo;{t.quote}&rdquo;
        </p>
        <strong className="block text-foreground">{t.name}</strong>
        <span className="text-[13.5px] text-ink-soft">{t.role}</span>
      </div>
      <div className="mt-7 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-2 rounded-full bg-border-c transition-all",
              i === current ? "w-5.5 bg-blue-500" : "w-2"
            )}
          />
        ))}
      </div>
    </div>
  );
}

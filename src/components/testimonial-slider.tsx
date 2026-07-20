"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/context";

export function TestimonialSlider({ testimonials }: { testimonials: Testimonial[] }) {
  const [current, setCurrent] = React.useState(0);
  const { dict } = useLanguage();

  React.useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (!testimonials.length) return null;
  const t = testimonials[current];

  return (
    <div className="mx-auto max-w-[760px] text-center">
      <div key={current} className="animate-fade-in min-h-[220px] sm:min-h-[200px]">
        <p className="mb-5.5 font-[family-name:var(--font-head)] text-xl font-semibold text-foreground sm:text-[21px]">
          &ldquo;{t.quote}&rdquo;
        </p>
        <strong className="block text-foreground">{t.student_name}</strong>
        <span className="text-[13.5px] text-ink-soft">{t.role_company}</span>
      </div>
      {testimonials.length > 1 && (
        <div className="mt-7 flex justify-center gap-2">
          {testimonials.map((item, i) => (
            <button
              key={item.id}
              aria-label={`${dict.testimonials.goToTestimonial} ${i + 1}`}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2 rounded-full bg-border-c transition-all",
                i === current ? "w-5.5 bg-blue-500" : "w-2"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

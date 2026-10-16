"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "up" | "soft" | "none";

/** Scroll-reveal wrapper. "up" is the default lift-in; "soft" is a quieter
 *  fade with a touch of blur for sections that should not bounce; "none"
 *  only gates the children on visibility (no transform). Content is shown
 *  immediately when it is already on screen, when motion is reduced, or
 *  when IntersectionObserver is unavailable, so nothing stays blank. */
export function Reveal({
  children,
  delay = 0,
  className,
  variant = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  variant?: Variant;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rect = el.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    if (!("IntersectionObserver" in window) || reduced || alreadyInView) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      // Fire as soon as any part enters the viewport: a tall section with a
      // high threshold could stay invisible on short phone screens.
      { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hidden =
    variant === "up" ? "translate-y-6 opacity-0" : variant === "soft" ? "scale-[0.985] opacity-0 blur-[6px]" : "opacity-0";
  const shown = variant === "up" ? "translate-y-0 opacity-100" : variant === "soft" ? "scale-100 opacity-100 blur-0" : "opacity-100";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-[opacity,transform,filter] duration-[900ms] [transition-timing-function:cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none",
        visible ? shown : hidden,
        className
      )}
    >
      {children}
    </div>
  );
}

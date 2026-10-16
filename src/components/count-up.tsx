"use client";

import * as React from "react";

/** Animates a stat like "500+", "98%" or "10+" from zero when it scrolls
 *  into view. Non-numeric values and reduced-motion users get the final
 *  text immediately; the server renders the final text too, so nothing
 *  depends on JavaScript to be readable. */
export function CountUp({ value, className, duration = 1400 }: { value: string | number; className?: string; duration?: number }) {
  const text = String(value ?? "");
  const match = text.match(/^(\D*)(\d[\d,]*)(\.\d+)?(.*)$/);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(text);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;
    const [, prefix, whole, fraction = "", suffix] = match;
    const target = Number(whole.replace(/,/g, ""));
    const decimals = fraction ? fraction.length - 1 : 0;
    const useGrouping = whole.includes(",");
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        const n = (target + Number(fraction || 0)) * eased;
        const formatted = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString(useGrouping ? "en-US" : undefined, { useGrouping });
        setShown(`${prefix}${formatted}${suffix}`);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setShown(text);
      };
      setShown(`${prefix}0${suffix}`);
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, duration]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true" className="tabular-nums">{shown}</span>
    </span>
  );
}

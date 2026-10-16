"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/** Floating "back to top" pill. Appears after the visitor has scrolled past
 *  the first screen, sits above the thumb zone on phones, and scrolls
 *  smoothly unless the OS asks for reduced motion. */
export function BackToTop() {
  const { dict } = useLanguage();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;
    const update = () => {
      setVisible(window.scrollY > Math.max(600, window.innerHeight * 0.8));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={dict.nav.backToTop}
      title={dict.nav.backToTop}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-5 end-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-navy-800/90 text-white shadow-[0_10px_30px_-10px_rgba(11,23,48,0.6)] backdrop-blur-md transition-all duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40 sm:bottom-7 sm:end-7",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

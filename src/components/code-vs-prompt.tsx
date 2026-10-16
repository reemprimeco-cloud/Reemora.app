"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Code2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Panel, Block } from "@/components/compare-panel";

/** Two panels, one clock. On the left a developer types the café page by
 *  hand, line after line, and is still typing when the loop ends. On the
 *  right a short prompt is typed, the page assembles, and it is "ready in
 *  12 seconds" while the left keeps going. Everything derives from one
 *  elapsed-time value so the two stay in sync; reduced-motion users see
 *  the end state. */

const LOOP_MS = 20000;
const FADE_MS = 600;
const CODE_CPS = 70; // characters per second typed by hand
const PROMPT_START = 500;
const PROMPT_CPS = 36;
const THINK_MS = 900;
const BLOCK_MS = 380;
const BLOCKS = 5;
const RIGHT_READY_SECONDS = 12;

const CODE = [
  "<!doctype html>",
  '<html lang="en">',
  "<head>",
  '  <meta charset="utf-8" />',
  '  <meta name="viewport" content="width=device-width" />',
  "  <title>Bayt Coffee</title>",
  "  <style>",
  "    body { margin: 0; font-family: Inter, sans-serif; }",
  "    header { display: flex; justify-content: space-between; padding: 16px 24px; }",
  "    .hero { background: #1b2a4a; color: #fff; padding: 64px 24px; }",
  "    .menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }",
  "    .card { border: 1px solid #e3e8f0; border-radius: 12px; padding: 16px; }",
  "    .btn { background: #25d366; color: #fff; border-radius: 999px; padding: 12px 20px; }",
  "    @media (max-width: 640px) { .menu { grid-template-columns: 1fr; } }",
  "  </style>",
  "</head>",
  "<body>",
  "  <header>",
  "    <strong>Bayt Coffee</strong>",
  '    <nav><a href="#menu">Menu</a> <a href="#hours">Hours</a></nav>',
  "  </header>",
  '  <section class="hero">',
  "    <h1>Specialty coffee, roasted in Kuwait</h1>",
  '    <a class="btn" href="https://wa.me/965XXXXXXXX">Order on WhatsApp</a>',
  "  </section>",
  '  <section id="menu" class="menu">',
  '    <div class="card">Flat white · 1.500 KWD</div>',
  '    <div class="card">Spanish latte · 1.750 KWD</div>',
  '    <div class="card">Croissant · 0.900 KWD</div>',
  "  </section>",
  "  <!-- TODO: Arabic version, RTL layout, opening hours, footer… -->",
];
const CODE_TEXT = CODE.join("\n");
const TOKEN = /(<!--[\s\S]*?-->|<\/?[a-zA-Z!][^>]*>|"[^"]*"|\{[^}]*\})/g;

function Token({ text }: { text: string }) {
  if (text.startsWith("<!--")) return <span className="text-[#7d8aa5]">{text}</span>;
  if (text.startsWith("<")) return <span className="text-[#8fb8ff]">{text}</span>;
  if (text.startsWith('"')) return <span className="text-[#9be2b0]">{text}</span>;
  if (text.startsWith("{")) return <span className="text-[#f3c98b]">{text}</span>;
  return <>{text}</>;
}

function CodeLine({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <Token key={i} text={p} />
      ))}
    </>
  );
}

export function CodeVsPrompt() {
  const { dict } = useLanguage();
  const t = dict.compare;
  const [elapsed, setElapsed] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Only run the clock while the section is on screen.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReduced(prefersReduced);
    if (prefersReduced || !("IntersectionObserver" in window)) {
      setRunning(!prefersReduced);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!running) return;
    let start = performance.now() - elapsed;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 45) {
        last = now;
        let e = now - start;
        if (e >= LOOP_MS) {
          start = now;
          e = 0;
        }
        setElapsed(e);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const e = reduced ? LOOP_MS - FADE_MS - 1 : elapsed;
  const fading = !reduced && e > LOOP_MS - FADE_MS;

  // Left: code typed by hand.
  const codeChars = Math.min(CODE_TEXT.length, Math.floor((e / 1000) * CODE_CPS));
  const typedCode = CODE_TEXT.slice(0, codeChars);
  const codeLines = typedCode.split("\n");
  const leftMinutes = Math.floor(e / 95); // compressed: the loop stands for ~3.5 hours
  const leftProgress = Math.min(38, Math.round((codeChars / CODE_TEXT.length) * 38));

  // Right: prompt, thinking, then the page assembles.
  const promptChars = Math.max(0, Math.min(t.prompt.length, Math.floor(((e - PROMPT_START) / 1000) * PROMPT_CPS)));
  const promptDone = PROMPT_START + (t.prompt.length / PROMPT_CPS) * 1000;
  const thinking = e >= promptDone && e < promptDone + THINK_MS;
  const blocksShown = Math.max(0, Math.min(BLOCKS, Math.floor((e - promptDone - THINK_MS) / BLOCK_MS) + 1));
  const readyAt = promptDone + THINK_MS + (BLOCKS - 1) * BLOCK_MS + 300;
  const ready = e >= readyAt;
  const rightSeconds = Math.min(RIGHT_READY_SECONDS, (e / readyAt) * RIGHT_READY_SECONDS);

  const h = Math.floor(leftMinutes / 60);
  const m = leftMinutes % 60;
  const leftClock = `${h}h ${String(m).padStart(2, "0")}m`;
  const rightClock = `0:${String(Math.floor(rightSeconds)).padStart(2, "0")}`;

  return (
    <div
      ref={rootRef}
      className={cn("transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}
      aria-live="off"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* Left: by hand */}
        <Panel
          icon={Code2}
          title={t.leftTitle}
          hint={t.leftHint}
          tone="code"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <Clock size={13} aria-hidden="true" /> {t.elapsed} <span className="tabular-nums text-foreground">{leftClock}</span>
              </span>
              <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t.stillWriting}
              </span>
            </>
          }
          progress={{ value: leftProgress, label: `${leftProgress}% ${t.progress}` }}
        >
          <div
            className="flex h-[410px] flex-col justify-end overflow-hidden rounded-xl bg-[#0f1a2e] px-4 py-3 font-mono text-[11.5px] leading-[1.6] text-[#dbe4f3] sm:h-[380px]"
            dir="ltr"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] text-[#7d8aa5]">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
              <span className="ms-2 rounded bg-white/5 px-2 py-0.5">index.html</span>
              <span className="ms-auto">{interpolate(t.lineOf, { n: codeLines.length })}</span>
            </div>
            {codeLines.map((line, i) => (
              <div key={i} className="flex whitespace-pre">
                <span className="w-7 shrink-0 select-none text-right text-[#4e5d7a]">{i + 1}</span>
                <span className="ps-3">
                  <CodeLine text={line} />
                  {i === codeLines.length - 1 && !reduced && (
                    <span className="ms-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] animate-pulse bg-[#8fb8ff]" aria-hidden="true" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* VS badge */}
        <div className="flex items-center justify-center lg:flex-col" aria-hidden="true">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface bg-navy-800 text-[12px] font-bold uppercase text-white shadow-[0_10px_24px_-12px_rgba(11,23,48,0.7)]">
            {t.vs}
          </span>
        </div>

        {/* Right: with a prompt */}
        <Panel
          icon={Sparkles}
          title={t.rightTitle}
          hint={t.rightHint}
          tone="prompt"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <Clock size={13} aria-hidden="true" /> {t.elapsed} <span className="tabular-nums text-foreground">{rightClock}</span>
              </span>
              <span
                className={cn(
                  "ms-auto inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11.5px] font-bold text-green-700 transition-all duration-500 dark:bg-green-950 dark:text-green-300",
                  ready ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                )}
              >
                <Check size={12} aria-hidden="true" /> {t.ready}
              </span>
            </>
          }
          chips={ready ? t.readyChips : []}
        >
          <div className="flex h-[410px] flex-col gap-2 overflow-hidden rounded-xl bg-surface-alt p-3 sm:h-[380px]">
            {/* prompt bubble */}
            <div className="rounded-2xl rounded-es-md border border-border-c bg-surface px-3.5 py-2.5 text-[12px] leading-relaxed" dir="auto">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{t.promptLabel}</p>
              {t.prompt.slice(0, promptChars)}
              {promptChars < t.prompt.length && !reduced && (
                <span className="ms-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-blue-500" aria-hidden="true" />
              )}
            </div>
            {/* thinking */}
            <div
              className={cn(
                "flex h-5 items-center gap-2 text-[11.5px] font-semibold text-ink-soft transition-opacity duration-300",
                thinking ? "opacity-100" : "opacity-0"
              )}
            >
              <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t.thinking}
            </div>
            {/* the page, assembling */}
            <div
              className={cn(
                "flex-1 overflow-hidden rounded-xl border border-border-c bg-surface p-2.5 transition-opacity duration-500",
                blocksShown >= 1 ? "opacity-100" : "opacity-0"
              )}
            >
              <Block show={blocksShown >= 1}>
                <div className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-1.5 text-[10.5px]">
                  <span className="font-bold">{t.page.brand}</span>
                  <span className="flex gap-2.5 text-ink-soft">
                    {t.page.nav.map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </span>
                </div>
              </Block>
              <Block show={blocksShown >= 2} className="mt-2">
                <div className="rounded-lg bg-gradient-to-br from-navy-900 to-blue-600 p-3 text-white">
                  <p className="text-[12.5px] font-bold leading-tight">{t.page.heroTitle}</p>
                  <p className="mt-0.5 text-[10px] text-[#c6d3ea]">{t.page.heroText}</p>
                </div>
              </Block>
              <Block show={blocksShown >= 3} className="mt-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {t.page.cards.map((c) => {
                    const [item, price] = c.split(" · ");
                    return (
                      <div key={c} className="min-w-0 rounded-lg border border-border-c px-2 py-1.5 leading-snug">
                        <p className="truncate text-[10px] font-bold">{item}</p>
                        <p className="truncate text-[9.5px] text-ink-soft">{price}</p>
                      </div>
                    );
                  })}
                </div>
              </Block>
              <Block show={blocksShown >= 4} className="mt-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#25d366] px-3 py-1.5 text-[10.5px] font-bold text-white">
                  <MessageCircle size={11} aria-hidden="true" /> {t.page.cta}
                </div>
              </Block>
              <Block show={blocksShown >= 5} className="mt-2">
                <p className="text-[10px] text-ink-soft">{t.page.hours}</p>
              </Block>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center sm:mt-10">
        <p className="max-w-[48ch] text-[15px] text-ink-soft sm:text-[16px]">{t.footnote}</p>
        <Link
          href="/courses"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-navy-800 active:scale-[0.98]"
        >
          {t.cta} <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

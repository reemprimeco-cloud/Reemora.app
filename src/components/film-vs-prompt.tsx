"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clapperboard,
  Clock,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { Panel, Block } from "@/components/compare-panel";

/** Third comparison: an animated short the studio way (weeks of script,
 *  storyboard, animation, voice and edit, shown as a production timeline
 *  that never finishes) versus a prompt that scripts, draws, narrates and
 *  exports the film in under an hour, followed by what that skill turns
 *  into: daily content and paid work. One clock drives both panels. */

const LOOP_MS = 24000;
const FADE_MS = 600;
const PROMPT_START = 500;
const PROMPT_CPS = 40;
const STEP_MS = 1100;
const STEPS = 4;
const READY_MINUTES = 58;
const OUTCOME_ICONS = [CalendarDays, BriefcaseBusiness, Banknote] as const;
const TRACK_COLORS = ["bg-[#5b8def]", "bg-[#f0a44b]", "bg-[#4fc08d]", "bg-[#b07cf0]"];
// Each track fills in segments; a segment appears once the loop has passed its start fraction.
const TRACK_SEGMENTS: readonly (readonly [number, number, number])[][] = [
  [[0.0, 0.02, 0.1], [0.12, 0.14, 0.12], [0.3, 0.36, 0.18], [0.55, 0.62, 0.22]],
  [[0.08, 0.1, 0.16], [0.28, 0.34, 0.14], [0.5, 0.56, 0.2]],
  [[0.2, 0.24, 0.1], [0.42, 0.47, 0.16], [0.7, 0.72, 0.12]],
  [[0.35, 0.4, 0.3], [0.78, 0.8, 0.12]],
];

export function FilmVsPrompt() {
  const { dict } = useLanguage();
  const t = dict.film;
  const [elapsed, setElapsed] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

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
  const f = e / LOOP_MS; // 0..1 through the loop
  const fading = !reduced && e > LOOP_MS - FADE_MS;

  // Left: the studio timeline. The loop stands for six weeks; it ends mid-animation.
  const week = Math.min(6, Math.floor(f * 6) + 1);
  const leftProgress = Math.min(22, Math.round(f * 22));
  const taskDone = (i: number) => f > (i + 1) * 0.28; // only the first task or two ever finish
  const taskActive = (i: number) => !taskDone(i) && (i === 0 || taskDone(i - 1));
  const playhead = (f * 100) % 100;

  // Right: prompt, then the four tool steps, then the film.
  const promptChars = Math.max(0, Math.min(t.prompt.length, Math.floor(((e - PROMPT_START) / 1000) * PROMPT_CPS)));
  const promptDone = PROMPT_START + (t.prompt.length / PROMPT_CPS) * 1000;
  const stepsDone = Math.max(0, Math.min(STEPS, Math.floor((e - promptDone) / STEP_MS)));
  const stepActive = e >= promptDone && stepsDone < STEPS ? stepsDone : -1;
  const readyAt = promptDone + STEPS * STEP_MS + 300;
  const ready = e >= readyAt;
  const filmVisible = stepsDone >= 2;
  const playing = ready;
  const rightMinutes = Math.min(READY_MINUTES, Math.floor((e / readyAt) * READY_MINUTES));
  const filmProgress = ready ? Math.min(100, ((e - readyAt) / 6000) * 100) : 0;

  return (
    <div ref={rootRef} className={cn("transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")} aria-live="off">
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {/* Left: the studio way */}
        <Panel
          icon={Clapperboard}
          title={t.leftTitle}
          hint={t.leftHint}
          tone="code"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <Clock size={13} aria-hidden="true" /> {t.elapsed}{" "}
                <span className="tabular-nums text-foreground">{interpolate(t.weekOf, { n: week })}</span>
              </span>
              <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11.5px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Loader2 size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t.stillAnimating}
              </span>
            </>
          }
          progress={{ value: leftProgress, label: `${leftProgress}% ${t.progress} · ${t.quote}` }}
        >
          <div className="flex h-[410px] flex-col overflow-hidden rounded-xl bg-[#0f1a2e] p-3 text-[#dbe4f3] sm:h-[380px]">
            {/* task list */}
            <ol className="space-y-1.5">
              {t.tasks.map((task, i) => {
                const done = taskDone(i);
                const active = taskActive(i);
                return (
                  <li key={task.name} className="flex items-center gap-2.5 text-[11.5px]">
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                        done
                          ? "border-[#4fc08d] bg-[#4fc08d] text-[#0f1a2e]"
                          : active
                            ? "border-[#f0a44b] text-[#f0a44b]"
                            : "border-white/15 text-white/40"
                      )}
                      aria-hidden="true"
                    >
                      {done ? <Check size={10} /> : active ? <Loader2 size={10} className="animate-spin motion-reduce:animate-none" /> : i + 1}
                    </span>
                    <span className={cn("flex-1 truncate", done ? "text-white/60 line-through" : active ? "text-white" : "text-white/55")}>
                      {task.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10.5px] text-white/45">{task.time}</span>
                  </li>
                );
              })}
            </ol>
            {/* preview + timeline */}
            <div className="mt-3 flex flex-1 flex-col rounded-lg border border-white/10 bg-black/30 p-2">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md bg-[#0b1322]">
                <div className="grid grid-cols-6 gap-1 opacity-30" aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} className={cn("h-5 w-7 rounded-sm", i < Math.round(f * 12) ? "bg-[#f0a44b]/70" : "bg-white/10")} />
                  ))}
                </div>
                <span className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-white/45">{t.tracks[0]} · frame {Math.round(f * 1440)} / 7200</span>
              </div>
              <div className="mt-2 flex gap-2" dir="ltr">
                <div className="w-14 shrink-0 space-y-1">
                  {t.tracks.map((track) => (
                    <p key={track} className="h-3 truncate text-[9.5px] leading-3 text-white/50">
                      {track}
                    </p>
                  ))}
                </div>
                <div className="relative flex-1 space-y-1">
                  {t.tracks.map((track, ti) => (
                    <div key={track} className="relative h-3 overflow-hidden rounded-sm bg-white/5">
                      {TRACK_SEGMENTS[ti].map(([appearAt, start, width], si) => (
                        <span
                          key={si}
                          className={cn(
                            "absolute top-0 h-full rounded-sm transition-opacity duration-500",
                            TRACK_COLORS[ti],
                            f >= appearAt ? "opacity-80" : "opacity-0"
                          )}
                          style={{ left: `${start * 100}%`, width: `${width * 100}%` }}
                        />
                      ))}
                    </div>
                  ))}
                  <span className="pointer-events-none absolute bottom-0 top-0 w-px bg-[#ff5f57]" style={{ left: `${playhead}%` }} aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {/* VS badge */}
        <div className="flex items-center justify-center lg:flex-col" aria-hidden="true">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-navy-900 bg-blue-500 text-[12px] font-bold uppercase text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)]">
            {t.vs}
          </span>
        </div>

        {/* Right: the Reemora way */}
        <Panel
          icon={Sparkles}
          title={t.rightTitle}
          hint={t.rightHint}
          tone="prompt"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
                <Clock size={13} aria-hidden="true" /> {t.elapsed}{" "}
                <span className="tabular-nums text-foreground">{rightMinutes} min</span>
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
          chips={ready ? t.quality : []}
        >
          <div className="flex h-[410px] flex-col gap-2 overflow-hidden rounded-xl bg-surface-alt p-3 sm:h-[380px]">
            {/* prompt */}
            <div className="rounded-2xl rounded-es-md border border-border-c bg-surface px-3.5 py-2.5 text-[11.5px] leading-relaxed" dir="auto">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft">{t.promptLabel}</p>
              {t.prompt.slice(0, promptChars)}
              {promptChars < t.prompt.length && !reduced && (
                <span className="ms-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-blue-500" aria-hidden="true" />
              )}
            </div>
            {/* tool steps */}
            <ol className="grid grid-cols-2 gap-1.5">
              {t.steps.map((step, i) => {
                const done = stepsDone > i;
                const active = stepActive === i;
                return (
                  <li
                    key={step.name}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[10.5px] transition-all duration-500",
                      done
                        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
                        : active
                          ? "border-blue-400 bg-blue-100/60"
                          : "border-border-c bg-surface opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        done ? "bg-green-500 text-white" : active ? "text-blue-600" : "bg-surface-alt text-ink-soft"
                      )}
                      aria-hidden="true"
                    >
                      {done ? <Check size={10} /> : active ? <Loader2 size={11} className="animate-spin motion-reduce:animate-none" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{step.name}</span>
                      <span className="block truncate text-ink-soft">{step.tool}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
            {/* the film */}
            <Block show={filmVisible} className="relative flex-1 overflow-hidden rounded-xl bg-navy-900">
              <div className="absolute inset-0 overflow-hidden">
                <Image
                  src="/showcase/ai-film.jpg"
                  alt={t.filmTitle}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className={cn(
                    "object-cover transition-transform duration-[6000ms] ease-linear motion-reduce:transition-none",
                    playing ? "scale-[1.08]" : "scale-100"
                  )}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8 text-white">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold">{t.filmTitle}</p>
                    <p className="text-[10px] text-white/75">{t.filmMeta}</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-navy-900" aria-hidden="true">
                    <Play size={14} className="ms-0.5" />
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
                  <div className="h-full rounded-full bg-[#f3c98b]" style={{ width: `${filmProgress}%` }} />
                </div>
              </div>
            </Block>
          </div>
        </Panel>
      </div>

      {/* What it turns into */}
      <div
        className={cn(
          "mt-8 transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
          ready || reduced ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
        aria-hidden={!(ready || reduced)}
      >
        <p className="mb-4 text-center text-[12px] font-bold uppercase tracking-wider text-[#9fb4d8]">{t.outcomesTitle}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {t.outcomes.map((o, i) => {
            const Icon = OUTCOME_ICONS[i] ?? Sparkles;
            return (
              <div
                key={o.title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white transition-all duration-700"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-tight">{o.title}</span>
                  <span className="mt-1 block text-[13px] leading-snug text-[#c6d3ea]">{o.text}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center sm:mt-10">
        <p className="max-w-[52ch] text-[14.5px] text-[#b7c5e0] sm:text-[15.5px]">{t.footnote}</p>
        <Link
          href="/courses"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-navy-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 active:scale-[0.98]"
        >
          {t.cta} <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

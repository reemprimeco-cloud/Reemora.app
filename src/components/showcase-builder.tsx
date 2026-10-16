"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Check,
  Loader2,
  Wifi,
  Battery,
  Signal,
  ArrowRight,
  Globe,
  Smartphone,
  PenLine,
  Briefcase,
  Newspaper,
  CalendarCheck,
  ShoppingBag,
  Scissors,
  Gamepad2,
  Star,
  Lock,
  RotateCcw,
  MessageCircle,
  CreditCard,
  Trophy,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/** The homepage's interactive moment. Visitors pick what they would build
 *  (website or app), a category, and optionally a name; the build steps
 *  tick through and a browser or phone mockup assembles block by block.
 *  Everything is deterministic and bilingual, so it always works without
 *  a server. Reduced-motion users see the finished mockup at once. */

type Kind = "website" | "app";
type Phase = "choose" | "building" | "live";
const STEP_MS = 650;

type WebTemplate = {
  name: string;
  nav: readonly string[];
  eyebrow: string;
  title: string;
  subtitle: string;
  heroCta: string;
  cards: readonly { title: string; text: string }[];
  footer: string;
};
type AppTemplate = {
  name: string;
  appEyebrow: string;
  appSubtitle: string;
  cardTitle: string;
  cardText: string;
  rows: readonly string[];
  rowMeta: readonly string[];
  note: string;
  cta: string;
};

const KIND_ICONS: Record<Kind, LucideIcon> = { website: Globe, app: Smartphone };
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  blog: PenLine,
  business: Briefcase,
  magazine: Newspaper,
  booking: CalendarCheck,
  shop: ShoppingBag,
  salon: Scissors,
  game: Gamepad2,
};
const NOTE_ICONS: Record<string, LucideIcon> = {
  shop: CreditCard,
  salon: MessageCircle,
  game: Trophy,
  magazine: Bookmark,
};
const NAME_MAX = 24;

export function ShowcaseBuilder() {
  const { dict, lang } = useLanguage();
  const t = dict.showcase;
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [category, setCategory] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("choose");
  const [stepsDone, setStepsDone] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const timers = React.useRef<number[]>([]);
  const mockRef = React.useRef<HTMLDivElement>(null);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  React.useEffect(() => {
    setReduced(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    return clearTimers;
  }, [clearTimers]);

  // Language switch mid-build: drop back to the chosen state so the
  // steps and mockup re-render in the new language without stale timers.
  React.useEffect(() => {
    clearTimers();
    setPhase("choose");
    setStepsDone(0);
  }, [lang, clearTimers]);

  const steps = kind ? t.steps[kind] : t.steps.app;
  const tools = kind ? t.tools[kind] : [];
  const categories = kind ? t.categories[kind] : [];
  const web =
    kind === "website" && category
      ? ((t.templates.website as Record<string, WebTemplate>)[category] ?? null)
      : null;
  const app =
    kind === "app" && category ? ((t.templates.app as Record<string, AppTemplate>)[category] ?? null) : null;
  const template: WebTemplate | AppTemplate | null = web ?? app;
  const displayName = name.trim().slice(0, NAME_MAX) || template?.name || "";
  const slug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-site";

  const canBuild = Boolean(kind && category);
  const building = phase === "building";
  const live = phase === "live";
  const blockVisible = (n: number) => live || (building && stepsDone >= Math.min(n, steps.length));

  function chooseKind(next: Kind) {
    clearTimers();
    setKind(next);
    setCategory(null);
    setPhase("choose");
    setStepsDone(0);
  }
  function chooseCategory(next: string) {
    clearTimers();
    setCategory(next);
    setPhase("choose");
    setStepsDone(0);
  }
  function restart() {
    clearTimers();
    setKind(null);
    setCategory(null);
    setName("");
    setPhase("choose");
    setStepsDone(0);
  }
  function build() {
    if (!canBuild) return;
    clearTimers();
    // On phones the mockup sits below the controls: bring it on screen.
    if (window.innerWidth < 1024) {
      mockRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    }
    if (reduced) {
      setStepsDone(steps.length);
      setPhase("live");
      return;
    }
    setStepsDone(0);
    setPhase("building");
    steps.forEach((_, s) => later(() => setStepsDone(s + 1), 300 + s * STEP_MS));
    later(() => setPhase("live"), 300 + steps.length * STEP_MS + 450);
  }

  const labelId = React.useId();

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
      {/* Left: the choices + build steps */}
      <div>
        <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-6">
          {/* Step 1 */}
          <p id={`${labelId}-kind`} className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
            {t.stepKind}
          </p>
          <div role="radiogroup" aria-labelledby={`${labelId}-kind`} className="grid grid-cols-2 gap-2.5">
            {t.kinds.map((k) => (
              <Option
                key={k.id}
                icon={KIND_ICONS[k.id as Kind]}
                label={k.label}
                hint={k.hint}
                selected={kind === k.id}
                onSelect={() => chooseKind(k.id as Kind)}
              />
            ))}
          </div>

          {/* Step 2 (slides open once a kind is chosen) */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
              kind ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
            aria-hidden={!kind}
          >
            <div className="min-h-0 overflow-hidden">
              <p id={`${labelId}-cat`} className="mb-3 mt-5 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
                {t.stepCategory}
              </p>
              <div role="radiogroup" aria-labelledby={`${labelId}-cat`} className="grid grid-cols-2 gap-2.5">
                {categories.map((c) => (
                  <Option
                    key={c.id}
                    icon={CATEGORY_ICONS[c.id] ?? Sparkles}
                    label={c.label}
                    hint={c.hint}
                    selected={category === c.id}
                    onSelect={() => chooseCategory(c.id)}
                    tabbable={Boolean(kind)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 + build */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
              category ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
            aria-hidden={!category}
          >
            <div className="min-h-0 overflow-hidden">
              <label htmlFor={`${labelId}-name`} className="mb-2 mt-5 block text-[12px] font-bold uppercase tracking-wider text-ink-soft">
                {t.stepName} <span className="font-semibold normal-case tracking-normal">({t.optional})</span>
              </label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  id={`${labelId}-name`}
                  type="text"
                  value={name}
                  maxLength={NAME_MAX}
                  placeholder={t.namePlaceholder}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      build();
                    }
                  }}
                  tabIndex={category ? 0 : -1}
                  dir="auto"
                  className="min-h-[48px] flex-1 rounded-full border border-border-c bg-surface-alt px-5 text-[15px] text-foreground outline-none transition placeholder:text-ink-soft/70 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20"
                />
                <button
                  type="button"
                  onClick={build}
                  disabled={!canBuild || building}
                  tabIndex={category ? 0 : -1}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-blue-500 px-6 text-[15px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-navy-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-blue-500"
                >
                  {building ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                  {live ? t.rebuild : t.build}
                </button>
              </div>
            </div>
          </div>

          {/* Build steps */}
          <ol className="mt-6 space-y-2.5" aria-label={t.buildingLabel} aria-live="polite">
            {steps.map((step, i) => {
              const done = stepsDone > i;
              const active = building && !done && stepsDone === i;
              return (
                <li
                  key={step}
                  className={cn(
                    "flex items-center gap-3 text-[14px] transition-all duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
                    building || live ? "translate-x-0 opacity-100" : "translate-x-2 opacity-35"
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors duration-300",
                      done
                        ? "border-green-500 bg-green-500 text-white"
                        : active
                          ? "border-blue-400 bg-blue-100 text-blue-600"
                          : "border-border-c bg-surface text-ink-soft"
                    )}
                    aria-hidden="true"
                  >
                    {done ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
                  </span>
                  <span className={cn("transition-colors", done ? "text-foreground" : "text-ink-soft")}>{step}</span>
                </li>
              );
            })}
          </ol>

          <div
            className={cn(
              "mt-5 flex flex-wrap items-center gap-2 transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
              live ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
            )}
            aria-hidden={!live}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[12px] font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" /> {t.liveLabel}
            </span>
            {tools.map((tool) => (
              <span key={tool} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft">
                {tool}
              </span>
            ))}
            <button
              type="button"
              onClick={restart}
              tabIndex={live ? 0 : -1}
              className="ms-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-ink-soft transition hover:text-blue-600"
            >
              <RotateCcw size={13} aria-hidden="true" /> {t.restart}
            </button>
          </div>
        </div>

        <p className="mt-5 text-[15px] text-ink-soft sm:text-[16px]">{t.footnote}</p>
      </div>

      {/* Right: the mockup + the invitation */}
      <div ref={mockRef} className="scroll-mt-24">
        {!kind ? (
          <div className="mx-auto flex min-h-[380px] w-full max-w-[560px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border-c bg-surface-alt/60 p-8 text-center sm:min-h-[460px]">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600" aria-hidden="true">
              <Sparkles size={24} />
            </span>
            <p className="text-[17px] font-bold">{t.placeholderTitle}</p>
            <p className="mt-1.5 max-w-[26ch] text-[14.5px] text-ink-soft">{t.placeholderText}</p>
          </div>
        ) : kind === "website" ? (
          <BrowserMock
            template={web}
            name={displayName}
            slug={slug}
            blockVisible={blockVisible}
            hint={phase === "choose" ? t.tapBuild : null}
            ready={Boolean(category)}
          />
        ) : (
          <PhoneMock
            template={app}
            category={category}
            name={displayName}
            blockVisible={blockVisible}
            hint={phase === "choose" ? t.tapBuild : null}
            ready={Boolean(category)}
          />
        )}

        {/* The invitation appears once the mockup is live */}
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,transform] duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
            live ? "mt-6 grid-rows-[1fr] translate-y-0 opacity-100" : "grid-rows-[0fr] translate-y-3 opacity-0"
          )}
          aria-hidden={!live}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mx-auto max-w-[560px] rounded-[22px] bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-6 text-white shadow-[0_24px_50px_-24px_rgba(11,23,48,0.7)] sm:p-7">
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#cfe0f8]">{t.liveLabel} · {displayName}</p>
              <p className="mt-1.5 text-[22px] font-bold leading-tight sm:text-[24px]">{t.resultTitle}</p>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#d7e2f5] sm:text-[15px]">{t.resultText}</p>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/courses"
                  tabIndex={live ? 0 : -1}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-navy-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 active:scale-[0.98]"
                >
                  {t.resultCta} <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  tabIndex={live ? 0 : -1}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/30 px-5 text-[14.5px] font-semibold text-white transition hover:bg-white/10"
                >
                  {t.resultSecondary}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Option({
  icon: Icon,
  label,
  hint,
  selected,
  onSelect,
  tabbable = true,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
  tabbable?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      tabIndex={tabbable ? 0 : -1}
      className={cn(
        "flex min-h-[56px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition-all duration-300 [transition-timing-function:cubic-bezier(.16,1,.3,1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/30",
        selected
          ? "border-navy-800 bg-navy-800 text-white shadow-[0_10px_24px_-12px_rgba(11,23,48,0.7)]"
          : "border-border-c bg-surface text-foreground hover:-translate-y-0.5 hover:border-blue-400"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected ? "bg-white/15 text-white" : "bg-blue-100 text-blue-600"
        )}
        aria-hidden="true"
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold leading-tight">{label}</span>
        <span className={cn("mt-0.5 block text-[11.5px] leading-snug", selected ? "text-[#cfe0f8]" : "text-ink-soft")}>
          {hint}
        </span>
      </span>
    </button>
  );
}

function Hint({ text }: { text: string | null }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 text-center transition-opacity duration-500",
        text ? "opacity-100" : "opacity-0"
      )}
      aria-hidden="true"
    >
      <span className="inline-flex items-center gap-2 rounded-full bg-surface/90 px-4 py-2 text-[13px] font-semibold text-ink-soft shadow-sm backdrop-blur">
        <Sparkles size={14} className="text-blue-500" /> {text}
      </span>
    </div>
  );
}

function BrowserMock({
  template,
  name,
  slug,
  blockVisible,
  hint,
  ready,
}: {
  template: WebTemplate | null;
  name: string;
  slug: string;
  blockVisible: (n: number) => boolean;
  hint: string | null;
  ready: boolean;
}) {
  const show = (n: number) => Boolean(template) && blockVisible(n);
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-blue-400/25 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-2xl bg-navy-900 p-2 shadow-[0_30px_60px_-20px_rgba(11,23,48,0.55)]">
        <div className="flex items-center gap-1.5 px-2 pb-2 pt-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ms-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] text-white/70" dir="ltr">
            <Lock size={10} /> <span className="truncate">{ready ? `${slug}.com` : "https://"}</span>
          </span>
        </div>
        <div className="relative h-[440px] overflow-hidden rounded-xl bg-surface-alt sm:h-[460px]">
          <Hint text={ready ? hint : null} />
          {/* nav */}
          <Block show={show(1)} className="mx-3 mt-3">
            <div className="flex items-center justify-between rounded-xl border border-border-c bg-surface px-3.5 py-2.5">
              <span className="truncate text-[13px] font-bold">{name}</span>
              <span className="hidden items-center gap-3 text-[11px] font-semibold text-ink-soft sm:flex">
                {template?.nav.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10.5px] font-bold text-white">{template?.nav[2]}</span>
            </div>
          </Block>
          {/* hero */}
          <Block show={show(2)} className="mx-3 mt-2.5">
            <div className="rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-4 text-white sm:p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#cfe0f8]">{template?.eyebrow}</p>
              <p className="mt-1 text-[17px] font-bold leading-tight sm:text-[19px]">{template?.title}</p>
              <p className="mt-1.5 text-[11.5px] text-[#c6d3ea]">{template?.subtitle}</p>
              <span className="mt-3 inline-block rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-navy-900">
                {template?.heroCta}
              </span>
            </div>
          </Block>
          {/* cards */}
          <div className="mx-3 mt-2.5 grid grid-cols-3 gap-2">
            {(template?.cards ?? []).map((card, i) => (
              <Block key={card.title} show={show(3)} delay={i * 110}>
                <div className="h-full rounded-xl border border-border-c bg-surface p-2 sm:p-2.5">
                  <div
                    className={cn(
                      "mb-2 h-9 rounded-lg sm:h-12",
                      i === 0 ? "bg-blue-100" : i === 1 ? "bg-amber-100 dark:bg-amber-950" : "bg-green-100 dark:bg-green-950"
                    )}
                    aria-hidden="true"
                  />
                  <p className="line-clamp-2 text-[10.5px] font-bold leading-snug sm:text-[11px]">{card.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-soft">{card.text}</p>
                </div>
              </Block>
            ))}
          </div>
          {/* footer */}
          <Block show={show(4)} className="absolute inset-x-3 bottom-3">
            <div className="flex items-center gap-2 rounded-xl bg-green-100 px-3.5 py-2 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
              <Check size={13} aria-hidden="true" /> <span className="truncate">{template?.footer}</span>
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

function PhoneMock({
  template,
  category,
  name,
  blockVisible,
  hint,
  ready,
}: {
  template: AppTemplate | null;
  category: string | null;
  name: string;
  blockVisible: (n: number) => boolean;
  hint: string | null;
  ready: boolean;
}) {
  const show = (n: number) => Boolean(template) && blockVisible(n);
  const CardIcon = (category && CATEGORY_ICONS[category]) || Sparkles;
  const NoteIcon = (category && NOTE_ICONS[category]) || Check;
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-blue-400/25 blur-3xl" aria-hidden="true" />
      <div className="relative rounded-[42px] border-[10px] border-navy-900 bg-navy-900 shadow-[0_30px_60px_-20px_rgba(11,23,48,0.55)]">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-navy-900" aria-hidden="true" />
        <div className="relative h-[520px] overflow-hidden rounded-[32px] bg-surface-alt sm:h-[560px]">
          <Hint text={ready ? hint : null} />
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-foreground">
            <span>9:41</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <Signal size={12} /> <Wifi size={12} /> <Battery size={14} />
            </span>
          </div>
          <Block show={show(1)} className="mx-4 mt-4">
            <div className="rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-4 text-white">
              <p className="text-[11px] font-semibold text-[#cfe0f8]">{template?.appEyebrow}</p>
              <p className="mt-0.5 truncate text-[18px] font-bold leading-tight">{name}</p>
              <p className="mt-2 text-[12px] text-[#c6d3ea]">{template?.appSubtitle}</p>
            </div>
          </Block>
          <Block show={show(2)} className="mx-4 mt-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border-c bg-surface p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600" aria-hidden="true">
                <CardIcon size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold">{template?.cardTitle}</p>
                <p className="text-[12px] text-ink-soft">{template?.cardText}</p>
              </div>
            </div>
          </Block>
          {(template?.rows ?? []).map((row, i) => (
            <Block key={row} show={show(3)} delay={i * 110} className="mx-4 mt-2">
              <div className="flex items-center justify-between rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-[12.5px]">
                <span className="flex items-center gap-2 font-semibold">
                  <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden="true" /> {row}
                </span>
                <span className="text-ink-soft">{template?.rowMeta[i] ?? ""}</span>
              </div>
            </Block>
          ))}
          <Block show={show(4)} className="mx-4 mt-3">
            <div className="flex items-center gap-2 rounded-xl bg-green-100 px-3.5 py-2.5 text-[12px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
              <NoteIcon size={14} aria-hidden="true" /> {template?.note}
            </div>
          </Block>
          <Block show={show(4)} delay={160} className="absolute inset-x-4 bottom-5">
            <div className="rounded-full bg-blue-500 py-3 text-center text-[14px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(79,127,191,0.9)]">
              {template?.cta}
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({
  show,
  delay = 0,
  className,
  children,
}: {
  show: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none",
        show ? "translate-y-0 scale-100 opacity-100 blur-0" : "translate-y-3 scale-[0.97] opacity-0 blur-[4px]",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

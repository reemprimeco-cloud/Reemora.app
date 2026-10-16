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
  Lock,
  RotateCcw,
  ChevronDown,
  Pipette,
  Coffee,
  CupSoda,
  Croissant,
  Utensils,
  Soup,
  CakeSlice,
  Cookie,
  Shirt,
  ShoppingBag,
  Gem,
  Watch,
  Gift,
  SprayCan,
  Droplets,
  Laptop,
  Headphones,
  Apple,
  Milk,
  ShoppingBasket,
  Flower2,
  Leaf,
  Scissors,
  Hand,
  Dumbbell,
  Heart,
  Stethoscope,
  Smile,
  Car,
  Camera,
  Image,
  House,
  Building2,
  KeyRound,
  GraduationCap,
  BookOpen,
  PenLine,
  Newspaper,
  Mic,
  Music,
  Ticket,
  Trophy,
  Star,
  Gamepad2,
  Map,
  ShoppingCart,
  ReceiptText,
  TrendingUp,
  CalendarDays,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import {
  SHOWCASE_CATALOG,
  SHOWCASE_COLORS,
  SHOWCASE_GROUP_ORDER,
  type PrimaryKind,
  type ShowcaseCategory,
} from "@/lib/showcase-catalog";

/** The homepage's interactive moment. Visitors pick what they would build
 *  (website or app), the kind of business, a brand color and a name; the
 *  build steps tick through and a browser or phone mockup assembles block
 *  by block with content that matches the business. Deterministic and
 *  bilingual, no server call. Reduced-motion users see the result at once. */

type Kind = "website" | "app";
type Phase = "choose" | "building" | "live";
const STEP_MS = 650;
const NAME_MAX = 24;

const KIND_ICONS: Record<Kind, LucideIcon> = { website: Globe, app: Smartphone };
const ICONS: Record<string, LucideIcon> = {
  coffee: Coffee, cup: CupSoda, croissant: Croissant, utensils: Utensils, soup: Soup, cake: CakeSlice, cookie: Cookie,
  shirt: Shirt, dress: ShoppingBag, scarf: Sparkles, bag: ShoppingBag, gem: Gem, watch: Watch, gift: Gift, spray: SprayCan,
  droplets: Droplets, smartphone: Smartphone, laptop: Laptop, headphones: Headphones, apple: Apple, milk: Milk,
  basket: ShoppingBasket, flower: Flower2, leaf: Leaf, scissors: Scissors, hand: Hand, dumbbell: Dumbbell, heart: Heart,
  stethoscope: Stethoscope, smile: Smile, car: Car, camera: Camera, image: Image, home: House, building: Building2,
  key: KeyRound, graduation: GraduationCap, book: BookOpen, pen: PenLine, newspaper: Newspaper, mic: Mic, music: Music,
  ticket: Ticket, trophy: Trophy, star: Star, gamepad: Gamepad2, map: Map, sparkles: Sparkles,
};
const PRIMARY_ICONS: Record<PrimaryKind, LucideIcon> = {
  calendar: CalendarDays, cart: ShoppingCart, order: ReceiptText, stat: TrendingUp, score: Trophy, ticket: Ticket,
};

/* Brand color helpers: everything in the mockup derives from one hex. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [27, 42, 74];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function shade(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
type Brand = { hex: string; gradient: string; onBrand: string; tint: string; soft: string };
function makeBrand(hex: string): Brand {
  const light = luminance(hex) > 0.45;
  return {
    hex,
    gradient: `linear-gradient(135deg, ${shade(hex, 0.45)} 0%, ${hex} 100%)`,
    onBrand: light ? "#0b1730" : "#ffffff",
    tint: rgba(hex, 0.12),
    soft: rgba(hex, 0.22),
  };
}

export function ShowcaseBuilder() {
  const { dict, lang } = useLanguage();
  const t = dict.showcase;
  const catalog = SHOWCASE_CATALOG[lang];
  const [kind, setKind] = React.useState<Kind | null>(null);
  const [categoryId, setCategoryId] = React.useState("");
  const [colorHex, setColorHex] = React.useState(SHOWCASE_COLORS[0].hex);
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("choose");
  const [stepsDone, setStepsDone] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const timers = React.useRef<number[]>([]);
  const mockRef = React.useRef<HTMLDivElement>(null);
  const labelId = React.useId();

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

  const category: ShowcaseCategory | null = catalog.find((c) => c.id === categoryId) ?? null;
  const steps = kind ? t.steps[kind] : t.steps.app;
  const tools = kind ? t.tools[kind] : [];
  const brand = React.useMemo(() => makeBrand(colorHex), [colorHex]);
  const displayName = name.trim().slice(0, NAME_MAX) || category?.name || "";
  const slug =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-business";
  const isPreset = SHOWCASE_COLORS.some((c) => c.hex === colorHex);

  const canBuild = Boolean(kind && category);
  const building = phase === "building";
  const live = phase === "live";
  const blockVisible = (n: number) => live || (building && stepsDone >= Math.min(n, steps.length));

  function reset(next: Partial<{ kind: Kind | null; categoryId: string }>) {
    clearTimers();
    if ("kind" in next) setKind(next.kind ?? null);
    if ("categoryId" in next) setCategoryId(next.categoryId ?? "");
    setPhase("choose");
    setStepsDone(0);
  }
  function restart() {
    reset({ kind: null, categoryId: "" });
    setName("");
    setColorHex(SHOWCASE_COLORS[0].hex);
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

  const sectionLabel = "mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-soft";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14">
      {/* Left: the choices + build steps */}
      <div>
        <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-6">
          {/* 1 · kind */}
          <p id={`${labelId}-kind`} className={sectionLabel}>
            {t.stepKind}
          </p>
          <div role="radiogroup" aria-labelledby={`${labelId}-kind`} className="grid grid-cols-2 gap-2.5">
            {t.kinds.map((k) => (
              <KindOption
                key={k.id}
                icon={KIND_ICONS[k.id as Kind]}
                label={k.label}
                hint={k.hint}
                selected={kind === k.id}
                onSelect={() => reset({ kind: k.id as Kind })}
              />
            ))}
          </div>

          {/* 2 · business (slides open once a kind is chosen) */}
          <Collapsible open={Boolean(kind)}>
            <label htmlFor={`${labelId}-cat`} className={cn(sectionLabel, "mt-5 block")}>
              {t.stepCategory}
            </label>
            <div className="relative">
              <select
                id={`${labelId}-cat`}
                value={categoryId}
                onChange={(e) => reset({ categoryId: e.target.value })}
                tabIndex={kind ? 0 : -1}
                className={cn(
                  "min-h-[48px] w-full appearance-none rounded-full border border-border-c bg-surface-alt pe-11 ps-5 text-[15px] text-foreground outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20",
                  !categoryId && "text-ink-soft"
                )}
              >
                <option value="" disabled>
                  {t.categoryPlaceholder}
                </option>
                {SHOWCASE_GROUP_ORDER.map((group) => (
                  <optgroup key={group} label={t.groups[group]}>
                    {catalog
                      .filter((c) => c.group === group)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
            </div>
          </Collapsible>

          {/* 3 · color, 4 · name, build */}
          <Collapsible open={Boolean(category)}>
            <p id={`${labelId}-color`} className={cn(sectionLabel, "mt-5")}>
              {t.stepColor}
            </p>
            <div role="radiogroup" aria-labelledby={`${labelId}-color`} className="flex flex-wrap items-center gap-2.5">
              {SHOWCASE_COLORS.map((c) => {
                const selected = colorHex === c.hex;
                const label = t.colors[c.id as keyof typeof t.colors] ?? c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    title={label}
                    tabIndex={category ? 0 : -1}
                    onClick={() => setColorHex(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform duration-300 [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40",
                      selected && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                    )}
                  >
                    {selected && <Check size={16} aria-hidden="true" />}
                  </button>
                );
              })}
              <label
                title={t.customColor}
                className={cn(
                  "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-300 hover:scale-110 focus-within:ring-4 focus-within:ring-blue-400/40",
                  !isPreset && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-surface"
                )}
                style={{
                  background: isPreset
                    ? "conic-gradient(#e03131, #f08c00, #2f9e44, #1971c2, #9c36b5, #e03131)"
                    : colorHex,
                }}
              >
                <span className="sr-only">{t.customColor}</span>
                <Pipette size={15} aria-hidden="true" />
                <input
                  type="color"
                  value={colorHex}
                  tabIndex={category ? 0 : -1}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>

            <label htmlFor={`${labelId}-name`} className={cn(sectionLabel, "mb-2 mt-5 block")}>
              {t.stepName} <span className="font-semibold normal-case tracking-normal">({t.optional})</span>
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id={`${labelId}-name`}
                type="text"
                value={name}
                maxLength={NAME_MAX}
                placeholder={category?.name ?? t.namePlaceholder}
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
                {building ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={16} aria-hidden="true" />
                )}
                {live ? t.rebuild : t.build}
              </button>
            </div>
          </Collapsible>

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
            <p className="mt-1.5 max-w-[28ch] text-[14.5px] text-ink-soft">{t.placeholderText}</p>
          </div>
        ) : kind === "website" ? (
          <BrowserMock
            category={category}
            name={displayName}
            slug={slug}
            brand={brand}
            blockVisible={blockVisible}
            hint={phase === "choose" ? t.tapBuild : null}
            days={t.days}
            trust={t.trust}
          />
        ) : (
          <PhoneMock
            category={category}
            name={displayName}
            brand={brand}
            blockVisible={blockVisible}
            hint={phase === "choose" ? t.tapBuild : null}
            days={t.days}
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
              <p className="text-[12px] font-bold uppercase tracking-wider text-[#cfe0f8]">
                {t.liveLabel} · {displayName}
              </p>
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

/* ---------- controls ---------- */

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)]",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden px-0.5 pb-0.5">{children}</div>
    </div>
  );
}

function KindOption({
  icon: Icon,
  label,
  hint,
  selected,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
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

/* ---------- mockup pieces ---------- */

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

function IconTile({ icon, brand, size = 36 }: { icon: string; brand: Brand; size?: number }) {
  const Icon = ICONS[icon] ?? Sparkles;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: brand.tint, color: brand.hex }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}

/** A week strip with the third day picked, for booking-style businesses. */
function WeekStrip({ brand, days }: { brand: Brand; days: readonly string[] }) {
  const [dates, setDates] = React.useState<number[]>([]);
  React.useEffect(() => {
    const today = new Date();
    setDates(
      Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i).getDate())
    );
  }, []);
  return (
    <div className="mt-2.5 grid grid-cols-7 gap-1" aria-hidden="true">
      {days.map((d, i) => {
        const picked = i === 2;
        return (
          <span
            key={i}
            className="flex flex-col items-center rounded-lg py-1 text-[10px] font-semibold"
            style={picked ? { backgroundColor: brand.hex, color: brand.onBrand } : { color: "var(--color-ink-soft)" }}
          >
            <span>{d}</span>
            <span className="text-[11.5px] font-bold">{dates[i] ?? ""}</span>
          </span>
        );
      })}
    </div>
  );
}

function PrimaryCard({ category, brand, days }: { category: ShowcaseCategory; brand: Brand; days: readonly string[] }) {
  const Icon = PRIMARY_ICONS[category.primary.kind];
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: brand.tint, color: brand.hex }}
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-bold">{category.primary.title}</p>
          <p className="truncate text-[12px] text-ink-soft">{category.primary.text}</p>
        </div>
      </div>
      {category.primary.kind === "calendar" && <WeekStrip brand={brand} days={days} />}
    </div>
  );
}

function BrowserMock({
  category,
  name,
  slug,
  brand,
  blockVisible,
  hint,
  days,
  trust,
}: {
  category: ShowcaseCategory | null;
  name: string;
  slug: string;
  brand: Brand;
  blockVisible: (n: number) => boolean;
  hint: string | null;
  days: readonly string[];
  trust: readonly string[];
}) {
  const show = (n: number) => Boolean(category) && blockVisible(n);
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: brand.soft }}
        aria-hidden="true"
      />
      <div className="relative rounded-2xl bg-navy-900 p-2 shadow-[0_30px_60px_-20px_rgba(11,23,48,0.55)]">
        <div className="flex items-center gap-1.5 px-2 pb-2 pt-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ms-2 flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] text-white/70" dir="ltr">
            <Lock size={10} /> <span className="truncate">{category ? `${slug}.com` : "https://"}</span>
          </span>
        </div>
        <div className="relative h-[470px] overflow-hidden rounded-xl bg-surface-alt sm:h-[490px]">
          <Hint text={category ? hint : null} />
          {/* nav */}
          <Block show={show(1)} className="mx-3 mt-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border-c bg-surface px-3.5 py-2.5">
              <span className="truncate text-[13px] font-bold">{name}</span>
              <span className="hidden items-center gap-3 text-[11px] font-semibold text-ink-soft sm:flex">
                {category?.nav.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                style={{ backgroundColor: brand.hex, color: brand.onBrand }}
              >
                {category?.nav[2]}
              </span>
            </div>
          </Block>
          {/* hero */}
          <Block show={show(2)} className="mx-3 mt-2.5">
            <div className="rounded-2xl p-4 sm:p-5" style={{ background: brand.gradient, color: brand.onBrand }}>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider opacity-80">{category?.eyebrow}</p>
              <p className="mt-1 text-[17px] font-bold leading-tight sm:text-[19px]">{category?.heroTitle}</p>
              <p className="mt-1.5 text-[11.5px] opacity-85">{category?.heroText}</p>
              <span
                className="mt-3 inline-block rounded-full px-3.5 py-1.5 text-[11px] font-bold"
                style={{ backgroundColor: brand.onBrand, color: brand.hex }}
              >
                {category?.cta}
              </span>
            </div>
          </Block>
          {/* three offers */}
          <div className="mx-3 mt-2.5 grid grid-cols-3 gap-2">
            {(category?.items ?? []).map((item, i) => (
              <Block key={item.title} show={show(3)} delay={i * 110}>
                <div className="h-full rounded-xl border border-border-c bg-surface p-2 sm:p-2.5">
                  <div
                    className="mb-2 flex h-11 items-center justify-center rounded-lg sm:h-14"
                    style={{ backgroundColor: brand.tint, color: brand.hex }}
                    aria-hidden="true"
                  >
                    {React.createElement(ICONS[item.icon] ?? Sparkles, { size: 20 })}
                  </div>
                  <p className="line-clamp-2 text-[10.5px] font-bold leading-snug sm:text-[11px]">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-ink-soft">{item.meta}</p>
                </div>
              </Block>
            ))}
          </div>
          {/* trust strip */}
          <Block show={show(4)} className="mx-3 mt-2.5">
            <div className="grid grid-cols-3 gap-2">
              {trust.map((line) => (
                <div
                  key={line}
                  className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center text-[10px] font-semibold"
                  style={{ backgroundColor: brand.tint, color: brand.hex }}
                >
                  <Star size={10} className="shrink-0" aria-hidden="true" /> <span className="truncate">{line}</span>
                </div>
              ))}
            </div>
          </Block>
          {/* primary + footer */}
          <Block show={show(4)} delay={120} className="absolute inset-x-3 bottom-3">
            {category && category.primary.kind === "calendar" ? (
              <div className="rounded-xl border border-border-c bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-bold">{category.primary.title}</span>
                  <span className="truncate text-ink-soft">{category.primary.text}</span>
                </div>
                <WeekStrip brand={brand} days={days} />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-green-100 px-3.5 py-2 text-[11px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                <Check size={13} aria-hidden="true" /> <span className="truncate">{category?.note}</span>
              </div>
            )}
          </Block>
        </div>
      </div>
    </div>
  );
}

function PhoneMock({
  category,
  name,
  brand,
  blockVisible,
  hint,
  days,
}: {
  category: ShowcaseCategory | null;
  name: string;
  brand: Brand;
  blockVisible: (n: number) => boolean;
  hint: string | null;
  days: readonly string[];
}) {
  const show = (n: number) => Boolean(category) && blockVisible(n);
  const calendar = category?.primary.kind === "calendar";
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div
        className="pointer-events-none absolute -inset-10 -z-10 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: brand.soft }}
        aria-hidden="true"
      />
      <div className="relative rounded-[42px] border-[10px] border-navy-900 bg-navy-900 shadow-[0_30px_60px_-20px_rgba(11,23,48,0.55)]">
        <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-navy-900" aria-hidden="true" />
        <div className="relative h-[560px] overflow-hidden rounded-[32px] bg-surface-alt sm:h-[600px]">
          <Hint text={category ? hint : null} />
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-foreground">
            <span>9:41</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <Signal size={12} /> <Wifi size={12} /> <Battery size={14} />
            </span>
          </div>
          {/* header */}
          <Block show={show(1)} className="mx-4 mt-4">
            <div className="rounded-2xl p-4" style={{ background: brand.gradient, color: brand.onBrand }}>
              <p className="text-[11px] font-semibold opacity-80">{category?.eyebrow}</p>
              <p className="mt-0.5 truncate text-[18px] font-bold leading-tight">{name}</p>
              <p className="mt-2 text-[12px] opacity-85">{category?.tagline}</p>
            </div>
          </Block>
          {/* primary card */}
          <Block show={show(2)} className="mx-4 mt-3">
            {category && <PrimaryCard category={category} brand={brand} days={days} />}
          </Block>
          {/* rows */}
          {(category?.items ?? []).map((item, i) => (
            <Block key={item.title} show={show(3)} delay={i * 110} className={cn("mx-4", calendar ? "mt-1.5" : "mt-2")}>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border-c bg-surface px-3 py-2 text-[12.5px]">
                <span className="flex min-w-0 items-center gap-2.5 font-semibold">
                  <IconTile icon={item.icon} brand={brand} size={calendar ? 28 : 32} />
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="shrink-0 text-[12px] text-ink-soft">{item.meta}</span>
              </div>
            </Block>
          ))}
          {/* note + action + tab bar */}
          <Block show={show(4)} className="absolute inset-x-0 bottom-0">
            <div className="mx-4 mb-2.5 flex items-center gap-2 rounded-xl bg-green-100 px-3.5 py-2 text-[12px] font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
              <Check size={14} aria-hidden="true" /> <span className="truncate">{category?.note}</span>
            </div>
            <div
              className="mx-4 rounded-full py-3 text-center text-[14px] font-semibold"
              style={{ backgroundColor: brand.hex, color: brand.onBrand, boxShadow: `0 12px 24px -12px ${rgba(brand.hex, 0.9)}` }}
            >
              {category?.cta}
            </div>
            <div className="mt-3 flex items-start justify-around border-t border-border-c bg-surface px-4 pb-5 pt-2.5" aria-hidden="true">
              {[House, Search, UserRound].map((Icon, i) => (
                <span
                  key={i}
                  className="flex flex-col items-center gap-0.5 text-[9.5px] font-semibold"
                  style={{ color: i === 0 ? brand.hex : "var(--color-ink-soft)" }}
                >
                  <Icon size={17} />
                  {category?.nav[i]}
                </span>
              ))}
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

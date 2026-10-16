import { Crown, Medal, Award, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoungeBadgeCode } from "@/lib/supabase/lounge.types";

export interface AwardBadge {
  code: LoungeBadgeCode;
  /** Challenge title, for the tooltip. */
  title?: string;
}

const STYLES: Record<LoungeBadgeCode, { icon: typeof Crown; label: string; labelAr: string; className: string }> = {
  champion: { icon: Crown, label: "Lounge Champion", labelAr: "بطل المجتمع", className: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800" },
  runner_up: { icon: Medal, label: "Runner-Up", labelAr: "الوصيف", className: "bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700" },
  third: { icon: Award, label: "Third Place", labelAr: "المركز الثالث", className: "bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800" },
  winner: { icon: Trophy, label: "Challenge Winner", labelAr: "فائز بالتحدي", className: "bg-blue-100 text-blue-600 ring-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800" },
};

export function badgeLabel(code: LoungeBadgeCode, lang: "en" | "ar") {
  return lang === "ar" ? STYLES[code].labelAr : STYLES[code].label;
}

/** Permanent competition badges rendered next to a member's name. Real
 *  visuals (icon + ring), not just emoji; the text label appears at the
 *  larger size and in the tooltip at the compact one. */
export function AwardBadges({ badges, size = "sm", lang = "en", max = 3 }: { badges: AwardBadge[]; size?: "xs" | "sm" | "md"; lang?: "en" | "ar"; max?: number }) {
  if (!badges.length) return null;
  // Highest honour first, one icon per distinct badge type at compact sizes.
  const order: LoungeBadgeCode[] = ["champion", "runner_up", "third", "winner"];
  const sorted = [...badges].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  const shown = size === "md" ? sorted : Array.from(new Map(sorted.map((b) => [b.code, b])).values()).slice(0, max);

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {shown.map((b, i) => {
        const s = STYLES[b.code];
        const label = badgeLabel(b.code, lang) + (b.title ? ` — ${b.title}` : "");
        return (
          <span
            key={`${b.code}-${i}`}
            title={label}
            aria-label={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-bold ring-1",
              size === "xs" && "h-5 w-5 justify-center",
              size === "sm" && "h-6 px-1.5 text-[10px]",
              size === "md" && "px-2.5 py-1 text-xs",
              s.className
            )}
          >
            <s.icon size={size === "md" ? 14 : 12} aria-hidden="true" />
            {size !== "xs" && (size === "md" ? label : badgeLabel(b.code, lang))}
          </span>
        );
      })}
    </span>
  );
}

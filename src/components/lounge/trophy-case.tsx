import Link from "next/link";
import { Trophy, Award, Star, Sparkles, Rocket, HeartHandshake, MessageCircle, TrendingUp, Crown, CalendarCheck, Medal, type LucideIcon } from "lucide-react";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import { interpolate } from "@/lib/i18n/dictionaries";
import { AwardBadges } from "@/components/lounge/award-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { LoungeAchievementTier, LoungeBadgeCode } from "@/lib/supabase/lounge.types";

/** Achievement `icon` values map to lucide icons here, so artwork stays
 *  consistent with the rest of the site and admins pick from a list. */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  sparkles: Sparkles,
  rocket: Rocket,
  handshake: HeartHandshake,
  message: MessageCircle,
  trending: TrendingUp,
  crown: Crown,
  calendar: CalendarCheck,
  medal: Medal,
};

const TIER_RING: Record<LoungeAchievementTier, string> = {
  bronze: "from-orange-200 to-amber-400 text-amber-900",
  silver: "from-slate-200 to-slate-400 text-slate-800",
  gold: "from-yellow-200 to-amber-400 text-amber-900",
  platinum: "from-cyan-100 to-blue-300 text-navy-900",
};

export interface TrophyItem {
  id: string;
  awarded_at: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string;
  description_ar: string | null;
  icon: string;
  tier: LoungeAchievementTier;
  points: number;
}

export interface AwardItem {
  id: string;
  code: LoungeBadgeCode;
  place: number;
  points: number;
  created_at: string;
  challengeId: string | null;
  title: string;
}

/** Profile sidebar: competition awards (separate, permanent) above
 *  achievements (earned trophies). Points are shown elsewhere — a number
 *  is never presented as a win. */
export function TrophyCase({ awards, trophies, lang }: { awards: AwardItem[]; trophies: TrophyItem[]; lang: "en" | "ar" }) {
  const t = DICTIONARIES[lang].lounge;
  return (
    <>
      <section className="rounded-2xl border border-border-c bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t.profile.awards}</h2>
        {awards.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.profile.noAwards}</p>
        ) : (
          <ul className="space-y-3">
            {awards.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <AwardBadges badges={[{ code: a.code }]} size="md" lang={lang} />
                <span className="min-w-0 text-sm">
                  {a.challengeId ? (
                    <Link href={`/lounge/challenges/${a.challengeId}`} className="block truncate font-semibold hover:text-blue-600">
                      {a.title}
                    </Link>
                  ) : (
                    <span className="block truncate font-semibold">{a.title}</span>
                  )}
                  <span className="text-xs text-ink-soft">{formatDate(a.created_at.slice(0, 10), lang)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border-c bg-surface p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t.profile.trophies}</h2>
        {trophies.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.profile.noTrophies}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3">
            {trophies.map((tr) => {
              const Icon = ACHIEVEMENT_ICONS[tr.icon] ?? Trophy;
              const name = lang === "ar" && tr.name_ar ? tr.name_ar : tr.name;
              const desc = lang === "ar" && tr.description_ar ? tr.description_ar : tr.description;
              return (
                <li key={tr.id} className="flex items-start gap-3">
                  <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", TIER_RING[tr.tier])} title={tr.tier}>
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold">
                      {name}
                      {tr.points > 0 && <span className="ms-2 text-xs font-bold text-blue-600">{interpolate(t.achievements.pointsReward, { n: tr.points })}</span>}
                    </span>
                    <span className="block text-xs text-ink-soft">{desc}</span>
                    <span className="block text-[11px] text-ink-soft">{interpolate(t.achievements.earned, { date: formatDate(tr.awarded_at.slice(0, 10), lang) })}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

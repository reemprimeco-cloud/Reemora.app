import Link from "next/link";
import { CalendarClock, Swords } from "lucide-react";
import type { LoungeDict } from "@/lib/i18n/lounge-dict";
import type { LoungeChallengeRow } from "@/lib/supabase/lounge.types";
import { effectivePhase } from "@/lib/lounge/challenges";
import { formatDateTime } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";

export const PHASE_STYLE: Record<LoungeChallengeRow["status"], string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  open: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  voting: "bg-blue-100 text-blue-600",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  finalized: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  cancelled: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
};

export function phaseLabel(phase: LoungeChallengeRow["status"], t: LoungeDict["challenges"]) {
  return { draft: t.statusDraft, open: t.statusOpen, paused: t.statusPaused, voting: t.statusVoting, closed: t.statusClosed, finalized: t.statusFinalized, cancelled: t.statusCancelled }[phase];
}

export function ChallengeCard({ challenge, dict, lang }: { challenge: LoungeChallengeRow; dict: LoungeDict; lang: "en" | "ar" }) {
  const t = dict.challenges;
  const phase = effectivePhase(challenge);
  const nextDate =
    phase === "open" ? [t.entriesClose, challenge.submissions_close_at] : phase === "voting" ? [t.votingCloses, challenge.voting_close_at] : phase === "closed" ? [t.votingOpens, challenge.voting_open_at] : null;

  return (
    <Link href={`/lounge/challenges/${challenge.id}`} className="block rounded-2xl border border-border-c bg-surface p-5 transition hover:-translate-y-0.5 hover:border-blue-400">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Swords size={18} aria-hidden="true" />
        </span>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", PHASE_STYLE[phase])}>{phaseLabel(phase, t)}</span>
      </div>
      <h2 className="text-[17px] font-bold leading-snug">{challenge.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{challenge.description}</p>
      {challenge.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {challenge.categories.map((c) => (
            <span key={c} className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">{c}</span>
          ))}
        </div>
      )}
      {nextDate && nextDate[1] && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-soft">
          <CalendarClock size={13} aria-hidden="true" /> {nextDate[0]}: {formatDateTime(nextDate[1], lang)}
        </p>
      )}
    </Link>
  );
}

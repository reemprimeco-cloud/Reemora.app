import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { loadChallengeDetail, effectivePhase } from "@/lib/lounge/challenges";
import { ChallengeEntries } from "@/components/lounge/challenge-entries";
import { EntryForm } from "@/components/lounge/entry-form";
import { PHASE_STYLE, phaseLabel } from "@/components/lounge/challenge-card";
import { formatDateTime } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Challenge" };

export default async function ChallengePage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireApprovedPage(`/lounge/challenges/${id}`);
  const lang = await getLang();
  const dict = getDict(lang).lounge;
  const t = dict.challenges;

  const detail = await loadChallengeDetail(id, viewer.user!.id);
  if (!detail) notFound();
  const { challenge, entries, awards, myEntry, myVoteEntryId } = detail;
  const phase = effectivePhase(challenge);
  const canEnter = phase === "open" && (!myEntry || myEntry.status === "withdrawn");

  const dates: [string, string | null][] = [
    [t.entriesOpen, challenge.submissions_open_at],
    [t.entriesClose, challenge.submissions_close_at],
    [t.votingOpens, challenge.voting_open_at],
    [t.votingCloses, challenge.voting_close_at],
  ];

  return (
    <div>
      <Link href="/lounge/challenges" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-blue-600">
        <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" /> {t.title}
      </Link>

      <section className="mb-6 rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-[11px] font-bold", PHASE_STYLE[phase])}>{phaseLabel(phase, t)}</span>
          {challenge.categories.map((c) => (
            <span key={c} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{c}</span>
          ))}
        </div>
        <h1 className="text-[26px] font-bold leading-tight sm:text-[32px]">{challenge.title}</h1>
        <p className="mt-3 max-w-[760px] whitespace-pre-line text-[15px] leading-relaxed">{challenge.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {dates.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border-c bg-surface-alt px-4 py-3">
              <dt className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <CalendarClock size={12} aria-hidden="true" /> {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold">{formatDateTime(value, lang)}</dd>
            </div>
          ))}
        </dl>

        {challenge.rules && (
          <details className="mt-5 rounded-xl border border-border-c bg-surface-alt p-4">
            <summary className="cursor-pointer text-sm font-bold">{t.rules}</summary>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-soft">{challenge.rules}</p>
            <p className="mt-2 text-xs text-ink-soft">{t.tieRule}</p>
          </details>
        )}
        {!challenge.rules && <p className="mt-4 text-xs text-ink-soft">{t.tieRule}</p>}
        {myEntry && myEntry.status !== "withdrawn" && <p className="mt-4 inline-flex rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">{t.entered}</p>}
      </section>

      {phase === "finalized" && awards.length > 0 && (
        <section className="mb-6 rounded-[22px] border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40 sm:p-6">
          <h2 className="mb-3 text-lg font-bold">🏆 {t.winners}</h2>
          <ol className="space-y-1.5 text-sm">
            {awards.map((a) => {
              const entry = entries.find((e) => e.id === a.entry_id);
              return (
                <li key={a.id}>
                  <span className="me-2">{a.place === 1 ? "🥇" : a.place === 2 ? "🥈" : "🥉"}</span>
                  <Link href={`/lounge/members/${a.member_id}`} className="font-bold hover:text-blue-600">
                    {entry?.member.display_name ?? "Member"}
                  </Link>
                  {entry && <span className="text-ink-soft"> — {entry.title}</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {canEnter && (
        <div className="mb-6">
          <EntryForm challenge={challenge} userId={viewer.user!.id} existing={null} />
        </div>
      )}
      {myEntry && myEntry.status !== "withdrawn" && phase === "open" && (
        <div className="mb-6">
          <EntryForm challenge={challenge} userId={viewer.user!.id} existing={myEntry} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">
          {phase === "finalized" ? t.results : t.entries} ({entries.filter((e) => e.status === "approved").length})
        </h2>
        <ChallengeEntries challenge={challenge} phase={phase} entries={entries} awards={awards} viewerId={viewer.user!.id} myVoteEntryId={myVoteEntryId} />
      </section>
    </div>
  );
}

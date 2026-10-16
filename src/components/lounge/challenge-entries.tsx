"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, ThumbsUp, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { AwardBadges } from "@/components/lounge/award-badge";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { memberHref, hostOf } from "@/lib/lounge/utils";
import { mediaSrc } from "@/lib/lounge/media";
import { cn } from "@/lib/utils";
import type { EntryWithMember } from "@/lib/lounge/challenges";
import type { LoungeChallengeAwardRow, LoungeChallengeRow } from "@/lib/supabase/lounge.types";

export function ChallengeEntries({
  challenge,
  phase,
  entries,
  awards,
  viewerId,
  myVoteEntryId,
}: {
  challenge: LoungeChallengeRow;
  phase: LoungeChallengeRow["status"];
  entries: EntryWithMember[];
  awards: LoungeChallengeAwardRow[];
  viewerId: string;
  myVoteEntryId: string | null;
}) {
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const t = dict.lounge.challenges;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [votedFor, setVotedFor] = React.useState(myVoteEntryId);
  const [counts, setCounts] = React.useState<Record<string, number>>(Object.fromEntries(entries.map((e) => [e.id, e.vote_count])));
  const [busy, setBusy] = React.useState<string | null>(null);

  const awardByMember = new Map(awards.map((a) => [a.member_id, a]));
  const canVote = phase === "voting";
  const showVotes = phase === "voting" || phase === "finalized" || phase === "closed";

  async function vote(entry: EntryWithMember) {
    if (busy) return;
    setBusy(entry.id);
    try {
      const res = await fetch(`/api/lounge/challenges/${challenge.id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: entry.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVotedFor(entry.id);
      setCounts(data.counts);
      showToast("success", t.voteRecorded);
    } catch (err) {
      showToast("error", err instanceof Error && err.message ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    if (!(await confirm(t.withdraw + "?", t.withdraw))) return;
    const res = await fetch(`/api/lounge/challenges/${challenge.id}/enter`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast("error", data.error || dict.lounge.common.error);
      return;
    }
    showToast("success", t.withdrawn);
    router.refresh();
  }

  const visible = entries.filter((e) => e.status === "approved" || e.member_id === viewerId);

  if (visible.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border-c bg-surface p-8 text-center text-ink-soft">{dict.lounge.feed.empty}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {visible.map((e) => {
        const own = e.member_id === viewerId;
        const award = awardByMember.get(e.member_id);
        const isVoted = votedFor === e.id;
        const rank = phase === "finalized" ? e.final_rank : null;
        return (
          <article key={e.id} className={cn("flex flex-col overflow-hidden rounded-2xl border bg-surface", rank === 1 ? "border-amber-300 shadow-md" : "border-border-c", e.status !== "approved" && "opacity-70")}>
            {e.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(e.image_url) ?? e.image_url} alt="" className="h-44 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-24 bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600" aria-hidden="true" />
            )}
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-bold leading-snug">
                  {rank && <span className="me-1.5">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}</span>}
                  {e.title}
                </h3>
                {award && <AwardBadges badges={[{ code: award.badge_code }]} size="sm" lang={lang} />}
              </div>
              <Link href={memberHref(e.member.user_id)} className="mb-2 inline-flex items-center gap-2 text-xs text-ink-soft hover:text-blue-600">
                <Avatar name={e.member.display_name} src={e.member.avatar_url} size="xs" /> {t.by} <span className="font-semibold text-foreground">{e.member.display_name}</span>
                <VerifiedBadge verified={e.member.is_verified} label={e.member.badge_label} size="xs" />
                {own && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">{t.ownEntry}</span>}
                {e.status === "submitted" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{t.pendingReview}</span>}
                {e.status === "rejected" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{t.rejected}</span>}
                {e.status === "withdrawn" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{t.withdrawn}</span>}
              </Link>
              <p className="line-clamp-3 flex-1 text-sm text-ink-soft">{e.description}</p>
              {e.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.tools.map((tool) => (
                    <span key={tool} className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-ink-soft">{tool}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-c pt-3">
                <a href={e.project_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full border border-border-c px-3.5 py-1.5 text-xs font-semibold transition hover:border-blue-400 hover:text-blue-600">
                  <ExternalLink size={12} aria-hidden="true" /> {hostOf(e.project_url)}
                </a>
                {showVotes && <span className="text-xs font-semibold text-ink-soft">{interpolate(t.votes, { n: counts[e.id] ?? e.vote_count })}</span>}
                <span className="ms-auto flex gap-2">
                  {own && (phase === "open" || phase === "paused") && (
                    <button type="button" onClick={withdraw} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-red-500">
                      <Trash2 size={12} aria-hidden="true" /> {t.withdraw}
                    </button>
                  )}
                  {canVote && !own && e.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => vote(e)}
                      disabled={busy !== null || (isVoted ? true : Boolean(votedFor) && !challenge.allow_vote_change)}
                      aria-pressed={isVoted}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                        isVoted ? "border-blue-400 bg-blue-100 text-blue-600" : "border-transparent bg-blue-500 text-white hover:bg-navy-800"
                      )}
                    >
                      <ThumbsUp size={12} className={isVoted ? "fill-current" : ""} aria-hidden="true" /> {isVoted ? t.voted : votedFor && challenge.allow_vote_change ? t.changeVote : t.vote}
                    </button>
                  )}
                  {canVote && own && <span className="text-xs text-ink-soft">{t.cannotVoteOwn}</span>}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

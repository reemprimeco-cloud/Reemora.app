import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Camera, Briefcase, AtSign, Play, Code2, Link2, Mail, Phone, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";
import { Avatar } from "@/components/lounge/avatar";
import { FollowButton } from "@/components/lounge/follow-button";
import { AwardBadges } from "@/components/lounge/award-badge";
import { TrophyCase } from "@/components/lounge/trophy-case";
import { PostCard } from "@/components/lounge/post-card";
import { ReportButton } from "@/components/lounge/report-button";
import { socialLinksOf, hostOf, formatDateTime } from "@/lib/lounge/utils";
import { loadPostsByAuthor } from "@/lib/lounge/feed";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Member" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MemberProfilePage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const viewer = await requireApprovedPage(`/lounge/members/${id}`);
  const lang = await getLang();
  const dict = getDict(lang).lounge;
  const t = dict.profile;

  const supabase = await createClient();
  const [{ data: member }, { data: contactRows }, { data: follow }, { data: awards }, { data: achievements }, { data: ledger }, posts] = await Promise.all([
    supabase.from("lounge_members").select("*").eq("user_id", id).eq("status", "approved").maybeSingle(),
    supabase.rpc("lounge_member_contact", { p_user_id: id }),
    supabase.from("lounge_follows").select("follower_id").match({ follower_id: viewer.user!.id, following_id: id }).maybeSingle(),
    supabase
      .from("lounge_challenge_awards")
      .select("id, badge_code, place, points_awarded, created_at, challenge:lounge_challenges(id, title)")
      .eq("member_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lounge_member_achievements")
      .select("id, awarded_at, achievement:lounge_achievements(code, name, name_ar, description, description_ar, icon, tier, points)")
      .eq("user_id", id)
      .order("awarded_at", { ascending: false }),
    supabase.from("lounge_points_ledger").select("id, delta, reason, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    loadPostsByAuthor(id, viewer.user!.id),
  ]);

  if (!member) notFound();

  const isSelf = member.user_id === viewer.user!.id;
  const contact = contactRows?.[0] ?? { email: null, phone: null };
  const links = socialLinksOf(member.social_links);
  const linkRows: { icon: typeof Globe; label: string; href: string }[] = [];
  if (member.website_url) linkRows.push({ icon: Globe, label: hostOf(member.website_url), href: member.website_url });
  const iconFor = { instagram: Camera, linkedin: Briefcase, x: AtSign, youtube: Play, github: Code2, other: Link2 } as const;
  for (const key of ["instagram", "linkedin", "x", "youtube", "github", "other"] as const) {
    const href = links[key];
    if (href) linkRows.push({ icon: iconFor[key], label: t[key], href });
  }

  type AwardRow = NonNullable<typeof awards>[number] & { challenge: { id: string; title: string } | { id: string; title: string }[] | null };
  const awardList = ((awards ?? []) as AwardRow[]).map((a) => {
    const ch = Array.isArray(a.challenge) ? a.challenge[0] : a.challenge;
    return { id: a.id, code: a.badge_code, place: a.place, points: a.points_awarded, created_at: a.created_at, challengeId: ch?.id ?? null, title: ch?.title ?? "" };
  });

  type AchRow = NonNullable<typeof achievements>[number];
  const trophies = ((achievements ?? []) as AchRow[])
    .map((row) => {
      const a = Array.isArray(row.achievement) ? row.achievement[0] : row.achievement;
      return a ? { id: row.id, awarded_at: row.awarded_at, ...a } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const projectCount = posts.filter((p) => p.type === "project").length;

  return (
    <div>
      <section className="mb-6 overflow-hidden rounded-[22px] border border-border-c bg-surface">
        <div className="h-24 bg-gradient-to-r from-navy-900 via-navy-800 to-blue-600 sm:h-28" aria-hidden="true" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <Avatar name={member.display_name} src={member.avatar_url} size="xl" className="ring-4" />
            <div className="flex flex-wrap gap-2">
              {isSelf ? (
                <Link href="/lounge/me" className="inline-flex items-center gap-2 rounded-full border border-border-c bg-surface px-5 py-2.5 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600">
                  <Pencil size={14} aria-hidden="true" /> {t.editTitle}
                </Link>
              ) : (
                <>
                  <FollowButton userId={member.user_id} initialFollowing={Boolean(follow)} initialCount={member.followers_count} />
                  <ReportButton targetType="member" targetId={member.user_id} />
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-bold leading-tight sm:text-[30px]">{member.display_name}</h1>
            <AwardBadges badges={awardList.map((a) => ({ code: a.code, title: a.title }))} size="sm" lang={lang} />
            {isSelf && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">{t.you}</span>}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{interpolate(t.memberSince, { date: formatDate(member.created_at.slice(0, 10), lang) })}</p>
          {member.bio && <p className="mt-4 max-w-[680px] whitespace-pre-line text-[15px] leading-relaxed">{member.bio}</p>}

          {member.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {member.skills.map((s) => (
                <span key={s} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">{s}</span>
              ))}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t.points, member.points_total],
              [t.followers, member.followers_count],
              [t.following, member.following_count],
              [t.projects, projectCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border-c bg-surface-alt px-4 py-3">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</dt>
                <dd className="mt-1 font-[family-name:var(--font-head)] text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          {(linkRows.length > 0 || contact.email || contact.phone) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {linkRows.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold transition hover:border-blue-400 hover:text-blue-600">
                  <l.icon size={13} aria-hidden="true" /> {l.label}
                </a>
              ))}
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold transition hover:border-blue-400 hover:text-blue-600" dir="ltr">
                  <Mail size={13} aria-hidden="true" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold transition hover:border-blue-400 hover:text-blue-600" dir="ltr">
                  <Phone size={13} aria-hidden="true" /> {contact.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t.postsBy}</h2>
          {posts.length === 0 ? (
            <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">{t.noPosts}</p>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} viewerId={viewer.user!.id} isAdmin={viewer.isAdmin} compact />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <TrophyCase awards={awardList} trophies={trophies} lang={lang} />
          <section className="rounded-2xl border border-border-c bg-surface p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{t.pointsHistory}</h2>
            {!ledger?.length ? (
              <p className="text-sm text-ink-soft">{t.noPoints}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ledger.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-3 border-b border-border-c pb-2 last:border-0 last:pb-0">
                    <span>
                      <span className="block">{row.reason}</span>
                      <span className="text-xs text-ink-soft">{formatDateTime(row.created_at, lang)}</span>
                    </span>
                    <span className={row.delta >= 0 ? "font-bold text-green-700 dark:text-green-400" : "font-bold text-red-500"}>
                      {row.delta >= 0 ? "+" : ""}
                      {row.delta}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { MembersDirectory, type DirectoryMember } from "@/components/lounge/members-directory";
import { PageHeader } from "@/components/lounge/page-header";
import type { AwardBadge } from "@/components/lounge/award-badge";

export const metadata: Metadata = { title: "Members" };

export default async function LoungeMembersPage() {
  await requireApprovedPage("/lounge/members");
  const lang = await getLang();
  const t = getDict(lang).lounge.members;

  const supabase = await createClient();
  const [{ data: members }, { data: awards }] = await Promise.all([
    supabase
      .from("lounge_members")
      .select("user_id, display_name, avatar_url, bio, skills, points_total, followers_count, created_at, is_verified, badge_label")
      .eq("status", "approved")
      .order("points_total", { ascending: false })
      .limit(500),
    supabase.from("lounge_challenge_awards").select("member_id, badge_code"),
  ]);

  const badgesByMember = new Map<string, AwardBadge[]>();
  for (const a of awards ?? []) {
    const list = badgesByMember.get(a.member_id) ?? [];
    list.push({ code: a.badge_code });
    badgesByMember.set(a.member_id, list);
  }

  const rows: DirectoryMember[] = (members ?? []).map((m) => ({ ...m, badges: badgesByMember.get(m.user_id) ?? [] }));

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <MembersDirectory members={rows} />
    </div>
  );
}

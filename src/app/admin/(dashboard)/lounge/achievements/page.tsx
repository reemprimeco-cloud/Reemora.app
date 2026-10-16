import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { LoungeAchievementsManager, type RecentAward, type LedgerRow } from "@/components/admin/lounge-achievements-manager";
import type { LoungeAchievementRow, LoungePointsRuleRow } from "@/lib/supabase/lounge.types";

export const metadata: Metadata = { title: "Lounge Achievements" };
export const dynamic = "force-dynamic";

export default async function AdminLoungeAchievementsPage() {
  let achievements: LoungeAchievementRow[] = [];
  let rules: LoungePointsRuleRow[] = [];
  let recentAwards: RecentAward[] = [];
  let ledger: LedgerRow[] = [];
  let members: { user_id: string; display_name: string; points_total: number }[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: defs }, { data: ruleRows }, { data: awardRows }, { data: ledgerRows }, { data: memberRows }, { data: admins }] = await Promise.all([
      supabase.from("lounge_achievements").select("*").order("sort_order"),
      supabase.from("lounge_points_rules").select("*").order("key"),
      supabase.from("lounge_member_achievements").select("id, user_id, achievement_id, awarded_at, source").order("awarded_at", { ascending: false }).limit(50),
      supabase.from("lounge_points_ledger").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("lounge_members").select("user_id, display_name, points_total").eq("status", "approved").order("display_name"),
      supabase.from("users").select("id, full_name, email").eq("role", "admin"),
    ]);
    achievements = defs ?? [];
    rules = ruleRows ?? [];
    members = memberRows ?? [];
    const nameOf = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? id.slice(0, 8);
    const adminName = (id: string | null) => (id ? (admins ?? []).find((a) => a.id === id)?.full_name ?? (admins ?? []).find((a) => a.id === id)?.email ?? "admin" : null);
    recentAwards = (awardRows ?? []).map((a) => {
      const def = achievements.find((d) => d.id === a.achievement_id);
      return { id: a.id, member_id: a.user_id, member_name: nameOf(a.user_id), achievement_name: def?.name ?? "—", points: def?.points ?? 0, awarded_at: a.awarded_at, source: a.source };
    });
    ledger = (ledgerRows ?? []).map((l) => ({ id: l.id, member_id: l.user_id, member_name: nameOf(l.user_id), delta: l.delta, reason: l.reason, ref_type: l.ref_type, actor_name: adminName(l.actor_id), created_at: l.created_at }));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Achievements &amp; Points</h1>
      <p className="mb-7 text-sm text-ink-soft">Configure what members can earn, tune activity points and caps, investigate awards, and make audited manual adjustments.</p>
      <LoungeAchievementsManager achievements={achievements} rules={rules} recentAwards={recentAwards} ledger={ledger} members={members} />
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { LoungeChallengesManager, type AdminEntry, type AdminAward } from "@/components/admin/lounge-challenges-manager";
import type { LoungeChallengeRow } from "@/lib/supabase/lounge.types";

export const metadata: Metadata = { title: "Lounge Challenges" };
export const dynamic = "force-dynamic";

export default async function AdminLoungeChallengesPage() {
  let challenges: LoungeChallengeRow[] = [];
  let entries: AdminEntry[] = [];
  let awards: AdminAward[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: ch }, { data: en }, { data: aw }, { data: members }] = await Promise.all([
      supabase.from("lounge_challenges").select("*").order("created_at", { ascending: false }),
      supabase.from("lounge_challenge_entries").select("id, challenge_id, member_id, title, project_url, status, vote_count, final_rank, created_at").order("vote_count", { ascending: false }).order("created_at"),
      supabase.from("lounge_challenge_awards").select("challenge_id, member_id, place, badge_code, points_awarded"),
      supabase.from("lounge_members").select("user_id, display_name"),
    ]);
    const nameOf = (id: string) => (members ?? []).find((m) => m.user_id === id)?.display_name ?? id.slice(0, 8);
    challenges = ch ?? [];
    entries = (en ?? []).map((e) => ({ ...e, member_name: nameOf(e.member_id) }));
    awards = (aw ?? []).map((a) => ({ challenge_id: a.challenge_id, member_name: nameOf(a.member_id), place: a.place, badge_code: a.badge_code, points_awarded: a.points_awarded }));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Challenges</h1>
      <p className="mb-7 text-sm text-ink-soft">Create competitions, open entries, run voting, moderate entries and finalize results. Finalizing awards permanent badges and points; it is safe to re-run.</p>
      <LoungeChallengesManager challenges={challenges} entries={entries} awards={awards} />
    </div>
  );
}

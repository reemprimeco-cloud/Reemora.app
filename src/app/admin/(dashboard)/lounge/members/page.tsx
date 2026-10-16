import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { LoungeMembersManager, type AdminMemberRow } from "@/components/admin/lounge-members-manager";

export const metadata: Metadata = { title: "Lounge Members" };
export const dynamic = "force-dynamic";

/** Reads run under the admin's own session: lounge_members / users /
 *  lounge_membership_events all grant admins full read via is_admin(). */
interface Stats {
  pending: number;
  approved: number;
  suspended: number;
  posts: number;
  comments: number;
  chat: number;
  openReports: number;
  newThisWeek: number;
}

export default async function AdminLoungeMembersPage() {
  let rows: AdminMemberRow[] = [];
  let stats: Stats | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: members }, { data: events }] = await Promise.all([
      supabase
        .from("lounge_members")
        .select("user_id, status, display_name, avatar_url, applied_at, decided_at, decided_by, decision_note, points_total, chat_muted_until")
        .order("applied_at", { ascending: false }),
      supabase.from("lounge_membership_events").select("id, user_id, action, actor_id, note, created_at").order("created_at", { ascending: false }),
    ]);

    const ids = new Set<string>();
    for (const m of members ?? []) {
      ids.add(m.user_id);
      if (m.decided_by) ids.add(m.decided_by);
    }
    for (const e of events ?? []) if (e.actor_id) ids.add(e.actor_id);

    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const count = (table: "lounge_posts" | "lounge_comments" | "lounge_chat_messages") => supabase.from(table).select("id", { count: "exact", head: true });
    const [{ count: posts }, { count: comments }, { count: chat }, { count: openReports }] = await Promise.all([
      count("lounge_posts"),
      count("lounge_comments"),
      count("lounge_chat_messages"),
      supabase.from("lounge_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    ]);
    stats = {
      pending: (members ?? []).filter((m) => m.status === "pending").length,
      approved: (members ?? []).filter((m) => m.status === "approved").length,
      suspended: (members ?? []).filter((m) => m.status === "suspended").length,
      posts: posts ?? 0,
      comments: comments ?? 0,
      chat: chat ?? 0,
      openReports: openReports ?? 0,
      newThisWeek: (members ?? []).filter((m) => m.applied_at > weekAgo).length,
    };

    const { data: users } = ids.size ? await supabase.from("users").select("id, email, phone, full_name").in("id", Array.from(ids)) : { data: [] };
    const userById = new Map((users ?? []).map((u) => [u.id, u]));
    const nameOf = (id: string | null) => (id ? userById.get(id)?.full_name ?? userById.get(id)?.email ?? null : null);

    rows = (members ?? []).map((m) => {
      const u = userById.get(m.user_id);
      return {
        user_id: m.user_id,
        status: m.status,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
        email: u?.email ?? "—",
        phone: u?.phone ?? null,
        full_name: u?.full_name ?? null,
        applied_at: m.applied_at,
        decided_at: m.decided_at,
        decided_by_name: nameOf(m.decided_by),
        decision_note: m.decision_note,
        points_total: m.points_total,
        chat_muted_until: m.chat_muted_until,
        history: (events ?? [])
          .filter((e) => e.user_id === m.user_id)
          .map((e) => ({ id: e.id, action: e.action, actor_name: e.actor_id === m.user_id ? null : nameOf(e.actor_id), note: e.note, created_at: e.created_at })),
      };
    });
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Members</h1>
      <p className="mb-7 text-sm text-ink-soft">Review applications, approve or reject, suspend or reactivate. Every decision is logged and the member is notified.</p>
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Pending applications", stats.pending],
            ["Approved members", stats.approved],
            ["Applied this week", stats.newThisWeek],
            ["Suspended", stats.suspended],
            ["Posts", stats.posts],
            ["Comments", stats.comments],
            ["Chat messages", stats.chat],
            ["Open reports", stats.openReports],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-border-c bg-surface p-5">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
              <strong className="mt-2 block font-[family-name:var(--font-head)] text-[26px]">{value}</strong>
            </div>
          ))}
        </div>
      )}
      <LoungeMembersManager initialMembers={rows} />
    </div>
  );
}

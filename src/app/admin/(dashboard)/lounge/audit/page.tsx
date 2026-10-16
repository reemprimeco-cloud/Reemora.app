import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

export const metadata: Metadata = { title: "Lounge Audit Log" };
export const dynamic = "force-dynamic";

export default async function AdminLoungeAuditPage() {
  let rows: { id: string; actor: string; action: string; target_type: string; target_id: string | null; details: string; created_at: string }[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: log } = await supabase.from("lounge_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
    const actorIds = Array.from(new Set((log ?? []).map((l) => l.actor_id).filter((x): x is string => Boolean(x))));
    const { data: users } = actorIds.length ? await supabase.from("users").select("id, email, full_name").in("id", actorIds) : { data: [] };
    const nameOf = (id: string | null) => (id ? (users ?? []).find((u) => u.id === id)?.full_name ?? (users ?? []).find((u) => u.id === id)?.email ?? id.slice(0, 8) : "system");
    rows = (log ?? []).map((l) => ({
      id: l.id,
      actor: nameOf(l.actor_id),
      action: l.action,
      target_type: l.target_type,
      target_id: l.target_id,
      details: JSON.stringify(l.details),
      created_at: l.created_at,
    }));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Audit Log</h1>
      <p className="mb-7 text-sm text-ink-soft">Every privileged Lounge action: membership decisions, moderation, points adjustments, achievement changes, challenge status and finalization.</p>
      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3.5 text-left">When</th>
                <th className="px-5 py-3.5 text-left">Actor</th>
                <th className="px-5 py-3.5 text-left">Action</th>
                <th className="px-5 py-3.5 text-left">Target</th>
                <th className="px-5 py-3.5 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border-c align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-ink-soft">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3">{r.actor}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-600">{r.action}</span>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {r.target_type}
                      {r.target_id && <span className="block font-mono text-[11px] text-ink-soft">{r.target_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="max-w-[420px] break-all px-5 py-3 font-mono text-[11px] text-ink-soft">{r.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

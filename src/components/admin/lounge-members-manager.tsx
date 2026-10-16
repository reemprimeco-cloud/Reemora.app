"use client";

import * as React from "react";
import { Check, X, Ban, RotateCcw, Search, History, VolumeX, Volume2, ExternalLink, BadgeCheck, BadgeMinus } from "lucide-react";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { cn } from "@/lib/utils";
import type { LoungeMemberStatus, LoungeMembershipAction } from "@/lib/supabase/lounge.types";

export interface AdminMemberRow {
  user_id: string;
  status: LoungeMemberStatus;
  display_name: string;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  full_name: string | null;
  applied_at: string;
  decided_at: string | null;
  decided_by_name: string | null;
  decision_note: string | null;
  points_total: number;
  chat_muted_until: string | null;
  is_verified: boolean;
  badge_label: string | null;
  history: { id: string; action: LoungeMembershipAction; actor_name: string | null; note: string | null; created_at: string }[];
}

const STATUS_STYLE: Record<LoungeMemberStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  suspended: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

type Filter = "pending" | "approved" | "rejected" | "suspended" | "all";

export function LoungeMembersManager({ initialMembers }: { initialMembers: AdminMemberRow[] }) {
  const [members, setMembers] = React.useState(initialMembers);
  const [filter, setFilter] = React.useState<Filter>("pending");
  const [query, setQuery] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [openHistory, setOpenHistory] = React.useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { pending: 0, approved: 0, rejected: 0, suspended: 0, all: members.length };
    for (const m of members) c[m.status]++;
    return c;
  }, [members]);

  const visible = members.filter((m) => {
    if (filter !== "all" && m.status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || m.display_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone ?? "").includes(q) || (m.full_name ?? "").toLowerCase().includes(q);
  });

  async function act(m: AdminMemberRow, action: "approve" | "reject" | "suspend" | "reactivate" | "mute" | "unmute" | "verify" | "unverify") {
    let note: string | undefined;
    let label: string | undefined;
    if (action === "verify") {
      const entered = window.prompt("Badge text shown next to their name:", m.badge_label || "Certified Member");
      if (entered === null) return;
      label = entered.trim() || "Verified";
    }
    if (action === "reject" || action === "suspend") {
      const label = action === "reject" ? "Reject" : "Suspend";
      if (!(await confirm(`${label} ${m.display_name} (${m.email})? They will be notified.`, `${label} member`))) return;
      note = window.prompt("Optional note for the member / audit log:")?.trim() || undefined;
    }
    setBusyId(m.user_id);
    try {
      const res = await fetch("/api/admin/lounge/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.user_id, action, note, label, hours: action === "mute" ? 24 : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMembers((prev) =>
        prev.map((row) => {
          if (row.user_id !== m.user_id) return row;
          if (action === "mute" || action === "unmute") return { ...row, chat_muted_until: data.chat_muted_until };
          if (action === "verify" || action === "unverify") return { ...row, is_verified: data.is_verified, badge_label: data.badge_label };
          const eventName = ({ approve: "approved", reject: "rejected", suspend: "suspended", reactivate: "reactivated" } as const)[action];
          return {
            ...row,
            status: data.status,
            decided_at: data.decided_at,
            decided_by_name: "You",
            decision_note: note ?? null,
            history: [{ id: `${Date.now()}`, action: eventName, actor_name: "You", note: note ?? null, created_at: data.decided_at }, ...row.history],
          };
        })
      );
      showToast("success", action === "verify" ? "Verified badge added." : action === "unverify" ? "Verified badge removed." : `Member ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "suspend" ? "suspended" : action === "reactivate" ? "reactivated" : action + "d"}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  }

  const btn = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border-c bg-surface p-1">
          {(["pending", "approved", "suspended", "rejected", "all"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition", filter === f ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}>
              {f} <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <label className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or phone" aria-label="Search members" className="w-full rounded-full border border-border-c bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400" />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">No members in this view.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const busy = busyId === m.user_id;
            const muted = m.chat_muted_until && new Date(m.chat_muted_until) > new Date();
            return (
              <div key={m.user_id} className="rounded-2xl border border-border-c bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3.5">
                    <Avatar name={m.display_name} src={m.avatar_url} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{m.display_name}</span>
                        <VerifiedBadge verified={m.is_verified} label={m.badge_label} size="sm" />
                        {m.full_name && m.full_name !== m.display_name && <span className="text-xs text-ink-soft">({m.full_name})</span>}
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize", STATUS_STYLE[m.status])}>{m.status}</span>
                        {muted && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950 dark:text-red-300">chat muted</span>}
                      </div>
                      <p className="mt-0.5 text-sm text-ink-soft" dir="ltr">
                        {m.email} · {m.phone ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Applied {new Date(m.applied_at).toLocaleString()}
                        {m.decided_at && (
                          <>
                            {" "}· Decided {new Date(m.decided_at).toLocaleString()} by {m.decided_by_name ?? "—"}
                          </>
                        )}
                        {m.decision_note && <> · “{m.decision_note}”</>}
                        {" "}· {m.points_total} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {m.status === "pending" && (
                      <>
                        <button disabled={busy} onClick={() => act(m, "approve")} className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300")}>
                          <Check size={13} /> Approve
                        </button>
                        <button disabled={busy} onClick={() => act(m, "reject")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                    {m.status === "approved" && (
                      <>
                        <button disabled={busy} onClick={() => act(m, m.is_verified ? "unverify" : "verify")} className={cn(btn, m.is_verified ? "border-border-c hover:border-red-300 hover:text-red-500" : "border-blue-400 bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white")} title={m.is_verified ? "Remove verified badge" : "Give a verified badge"}>
                          {m.is_verified ? <BadgeMinus size={13} /> : <BadgeCheck size={13} />} {m.is_verified ? "Unverify" : "Verify"}
                        </button>
                        <button disabled={busy} onClick={() => act(m, muted ? "unmute" : "mute")} className={cn(btn, "border-border-c hover:border-amber-400 hover:text-amber-600")} title={muted ? "Unmute in chat" : "Mute in chat for 24h"}>
                          {muted ? <Volume2 size={13} /> : <VolumeX size={13} />} {muted ? "Unmute" : "Mute 24h"}
                        </button>
                        <button disabled={busy} onClick={() => act(m, "suspend")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
                          <Ban size={13} /> Suspend
                        </button>
                      </>
                    )}
                    {m.status === "suspended" && (
                      <button disabled={busy} onClick={() => act(m, "reactivate")} className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300")}>
                        <RotateCcw size={13} /> Reactivate
                      </button>
                    )}
                    {m.status === "rejected" && (
                      <button disabled={busy} onClick={() => act(m, "approve")} className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300")}>
                        <Check size={13} /> Approve after all
                      </button>
                    )}
                    <a href={`/lounge/members/${m.user_id}`} target="_blank" rel="noopener" className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                      <ExternalLink size={13} /> Profile
                    </a>
                    <button onClick={() => setOpenHistory(openHistory === m.user_id ? null : m.user_id)} className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")} aria-expanded={openHistory === m.user_id}>
                      <History size={13} /> History ({m.history.length})
                    </button>
                  </div>
                </div>

                {openHistory === m.user_id && (
                  <ul className="mt-4 space-y-1.5 border-t border-border-c pt-3 text-xs text-ink-soft">
                    {m.history.map((h) => (
                      <li key={h.id}>
                        <span className="font-semibold capitalize text-foreground">{h.action}</span> · {new Date(h.created_at).toLocaleString()} · {h.actor_name ?? "member"}
                        {h.note && <> · “{h.note}”</>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

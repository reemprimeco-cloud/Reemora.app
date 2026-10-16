"use client";

import * as React from "react";
import { Plus, Save, Trash2, Coins } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { ACHIEVEMENT_ICONS } from "@/components/lounge/trophy-case";
import { ACHIEVEMENT_TIERS, CRITERIA_TYPES } from "@/lib/lounge/validation";
import { cn } from "@/lib/utils";
import type { LoungeAchievementRow, LoungePointsRuleRow } from "@/lib/supabase/lounge.types";

export interface RecentAward {
  id: string;
  member_name: string;
  member_id: string;
  achievement_name: string;
  points: number;
  awarded_at: string;
  source: string | null;
}

export interface LedgerRow {
  id: string;
  member_name: string;
  member_id: string;
  delta: number;
  reason: string;
  ref_type: string;
  actor_name: string | null;
  created_at: string;
}

const EMPTY: Omit<LoungeAchievementRow, "id" | "created_at" | "updated_at"> = {
  code: "",
  name: "",
  name_ar: "",
  description: "",
  description_ar: "",
  icon: "trophy",
  tier: "bronze",
  points: 0,
  criteria_type: "posts_count",
  criteria_threshold: 1,
  is_active: true,
  sort_order: 100,
};

const CRITERIA_LABEL: Record<(typeof CRITERIA_TYPES)[number], string> = {
  profile_complete: "Profile completed (threshold ignored)",
  posts_count: "Posts published ≥ threshold",
  projects_count: "Projects published ≥ threshold",
  helpful_count: "Answers marked helpful ≥ threshold",
  project_interactions: "Likes + comments on projects ≥ threshold",
  discussion_started: "A discussion with ≥ threshold comments",
  challenge_wins: "Challenge first places ≥ threshold",
  project_months: "Distinct months with a project ≥ threshold",
};

const input = "w-full rounded-lg border border-border-c bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-surface";

export function LoungeAchievementsManager({
  achievements: initial,
  rules: initialRules,
  recentAwards,
  ledger,
  members,
}: {
  achievements: LoungeAchievementRow[];
  rules: LoungePointsRuleRow[];
  recentAwards: RecentAward[];
  ledger: LedgerRow[];
  members: { user_id: string; display_name: string; points_total: number }[];
}) {
  const [achievements, setAchievements] = React.useState(initial);
  const [rules, setRules] = React.useState(initialRules);
  const [awards, setAwards] = React.useState(recentAwards);
  const [editing, setEditing] = React.useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [adjust, setAdjust] = React.useState({ userId: "", delta: "", reason: "" });
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function saveAchievement(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editing.code,
          name: editing.name,
          nameAr: editing.name_ar ?? "",
          description: editing.description,
          descriptionAr: editing.description_ar ?? "",
          icon: editing.icon,
          tier: editing.tier,
          points: Number(editing.points),
          criteriaType: editing.criteria_type,
          criteriaThreshold: Number(editing.criteria_threshold),
          isActive: editing.is_active,
          sortOrder: Number(editing.sort_order),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? `${data.error} ${Object.entries(data.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ")}` : "Request failed");
      setAchievements((prev) => {
        const idx = prev.findIndex((a) => a.code === data.achievement.code);
        return idx >= 0 ? prev.map((a, i) => (i === idx ? data.achievement : a)) : [...prev, data.achievement];
      });
      setEditing(null);
      showToast("success", "Achievement saved.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveRule(rule: LoungePointsRuleRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/achievements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: rule.key, points: Number(rule.points), dailyCap: rule.daily_cap ? Number(rule.daily_cap) : null, isActive: rule.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setRules((prev) => prev.map((r) => (r.key === rule.key ? data.rule : r)));
      showToast("success", "Rule saved.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(a: RecentAward) {
    if (!(await confirm(`Revoke "${a.achievement_name}" from ${a.member_name}? Its points will be reversed.`, "Revoke achievement"))) return;
    const reason = window.prompt("Reason (recorded in the audit log):")?.trim();
    if (!reason || reason.length < 3) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/achievements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberAchievementId: a.id, reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setAwards((prev) => prev.filter((x) => x.id !== a.id));
      showToast("success", "Achievement revoked and points reversed.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjust(e: React.FormEvent) {
    e.preventDefault();
    const delta = Number(adjust.delta);
    if (!adjust.userId || !Number.isInteger(delta) || delta === 0 || adjust.reason.trim().length < 3) {
      showToast("error", "Pick a member, a non-zero whole number, and a reason.");
      return;
    }
    if (!(await confirm(`Apply ${delta > 0 ? "+" : ""}${delta} points? The member will be notified and the change logged.`, "Adjust points"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: adjust.userId, delta, reason: adjust.reason.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      showToast("success", `Done — new balance ${data.pointsTotal}.`);
      setAdjust({ userId: "", delta: "", reason: "" });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-soft">Achievement definitions</h2>
          <button type="button" onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-full border-2 border-transparent bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
            <Plus size={13} /> New achievement
          </button>
        </div>

        {editing && (
          <form onSubmit={saveAchievement} className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-blue-400 bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold">
              Code (a-z, 0-9, _)
              <input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} required pattern="[a-z0-9_]{2,40}" className={input} />
            </label>
            <label className="text-xs font-semibold">
              Name
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required className={input} />
            </label>
            <label className="text-xs font-semibold">
              Name (Arabic)
              <input value={editing.name_ar ?? ""} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} dir="rtl" className={input} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2 lg:col-span-3">
              Description
              <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} required className={input} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2 lg:col-span-3">
              Description (Arabic)
              <input value={editing.description_ar ?? ""} onChange={(e) => setEditing({ ...editing, description_ar: e.target.value })} dir="rtl" className={input} />
            </label>
            <label className="text-xs font-semibold">
              Icon
              <select value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} className={input}>
                {Object.keys(ACHIEVEMENT_ICONS).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Tier
              <select value={editing.tier} onChange={(e) => setEditing({ ...editing, tier: e.target.value as LoungeAchievementRow["tier"] })} className={input}>
                {ACHIEVEMENT_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Points reward
              <input type="number" min={0} value={editing.points} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })} className={input} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Unlock criteria
              <select value={editing.criteria_type} onChange={(e) => setEditing({ ...editing, criteria_type: e.target.value })} className={input}>
                {CRITERIA_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {CRITERIA_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Threshold
              <input type="number" min={1} value={editing.criteria_threshold} onChange={(e) => setEditing({ ...editing, criteria_threshold: Number(e.target.value) })} className={input} />
            </label>
            <label className="text-xs font-semibold">
              Sort order
              <input type="number" min={0} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className={input} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
            </label>
            <div className="flex gap-2 self-end sm:col-span-2 lg:col-span-1">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
                <Save size={13} /> Save
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-border-c px-5 py-2 text-xs font-semibold">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {achievements
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((a) => {
              const Icon = ACHIEVEMENT_ICONS[a.icon] ?? ACHIEVEMENT_ICONS.trophy;
              return (
                <button key={a.id} type="button" onClick={() => setEditing({ ...a })} className={cn("flex items-start gap-3 rounded-2xl border bg-surface p-4 text-left transition hover:border-blue-400", a.is_active ? "border-border-c" : "border-dashed border-border-c opacity-60")}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block font-bold">
                      {a.name} <span className="font-mono text-[11px] text-ink-soft">{a.code}</span>
                    </span>
                    <span className="block text-xs text-ink-soft">{a.description}</span>
                    <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      {a.tier} · {a.points} pts · {CRITERIA_LABEL[a.criteria_type as (typeof CRITERIA_TYPES)[number]] ?? a.criteria_type} ({a.criteria_threshold}){!a.is_active && " · inactive"}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Activity points rules</h2>
        <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3 text-left">Rule</th>
                <th className="px-4 py-3 text-left">Points</th>
                <th className="px-4 py-3 text-left">Daily cap</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.key} className="border-t border-border-c">
                  <td className="px-4 py-2.5">
                    {r.label} <span className="font-mono text-[11px] text-ink-soft">{r.key}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={0} value={r.points} onChange={(e) => setRules((prev) => prev.map((x) => (x.key === r.key ? { ...x, points: Number(e.target.value) } : x)))} className={cn(input, "w-24")} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="number" min={1} value={r.daily_cap ?? ""} placeholder="none" onChange={(e) => setRules((prev) => prev.map((x) => (x.key === r.key ? { ...x, daily_cap: e.target.value ? Number(e.target.value) : null } : x)))} className={cn(input, "w-24")} />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={r.is_active} onChange={(e) => setRules((prev) => prev.map((x) => (x.key === r.key ? { ...x, is_active: e.target.checked } : x)))} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" disabled={busy} onClick={() => saveRule(r)} className="inline-flex items-center gap-1 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
                      <Save size={12} /> Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Manual points adjustment</h2>
          <form onSubmit={submitAdjust} className="grid gap-3 rounded-2xl border border-border-c bg-surface p-5">
            <label className="text-xs font-semibold">
              Member
              <select value={adjust.userId} onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })} className={input} required>
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name} ({m.points_total} pts)
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Points (+/-)
              <input type="number" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} className={input} required />
            </label>
            <label className="text-xs font-semibold">
              Reason (shown to the member)
              <input value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} className={input} required minLength={3} />
            </label>
            <button type="submit" disabled={busy} className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-500 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
              <Coins size={13} /> Apply adjustment
            </button>
          </form>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Recent achievement awards</h2>
          <div className="space-y-2">
            {awards.length === 0 && <p className="rounded-2xl border border-border-c bg-surface p-6 text-center text-sm text-ink-soft">No awards yet.</p>}
            {awards.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border-c bg-surface px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{a.member_name}</span> · {a.achievement_name} <span className="text-xs text-ink-soft">(+{a.points}) · {new Date(a.awarded_at).toLocaleDateString()} · {a.source}</span>
                </span>
                <button type="button" disabled={busy} onClick={() => revoke(a)} title="Revoke" className="shrink-0 rounded-lg border border-border-c p-1.5 text-ink-soft hover:border-red-300 hover:text-red-500 disabled:opacity-50">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Points ledger (latest 100)</h2>
        <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Δ</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">By</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                      No ledger entries yet.
                    </td>
                  </tr>
                )}
                {ledger.map((l) => (
                  <tr key={l.id} className="border-t border-border-c">
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-ink-soft">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2">{l.member_name}</td>
                    <td className={cn("px-4 py-2 font-bold", l.delta >= 0 ? "text-green-700" : "text-red-500")}>{l.delta >= 0 ? `+${l.delta}` : l.delta}</td>
                    <td className="px-4 py-2">{l.reason}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-ink-soft">{l.ref_type}</td>
                    <td className="px-4 py-2 text-xs text-ink-soft">{l.actor_name ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

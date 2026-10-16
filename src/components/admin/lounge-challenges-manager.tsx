"use client";

import * as React from "react";
import { Plus, Save, Play, Pause, Vote, Lock, Flag, Ban, Check, X, ExternalLink } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import type { LoungeChallengeRow, LoungeChallengeStatus } from "@/lib/supabase/lounge.types";

export interface AdminEntry {
  id: string;
  challenge_id: string;
  member_id: string;
  member_name: string;
  title: string;
  project_url: string;
  status: string;
  vote_count: number;
  final_rank: number | null;
  created_at: string;
}

export interface AdminAward {
  challenge_id: string;
  member_name: string;
  place: number;
  badge_code: string;
  points_awarded: number;
}

interface FormState {
  title: string;
  description: string;
  rules: string;
  categories: string;
  submissionsOpenAt: string;
  submissionsCloseAt: string;
  votingOpenAt: string;
  votingCloseAt: string;
  maxEntries: string;
  allowVoteChange: boolean;
}

const EMPTY: FormState = { title: "", description: "", rules: "", categories: "Websites, AI Apps, Automation, Productivity Tools", submissionsOpenAt: "", submissionsCloseAt: "", votingOpenAt: "", votingCloseAt: "", maxEntries: "", allowVoteChange: false };

/** <input type="datetime-local"> wants local time without zone; the API
 *  stores UTC. Convert both ways here so admins think in their own clock. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : "";
}

function toForm(c: LoungeChallengeRow): FormState {
  return {
    title: c.title,
    description: c.description,
    rules: c.rules ?? "",
    categories: c.categories.join(", "),
    submissionsOpenAt: toLocalInput(c.submissions_open_at),
    submissionsCloseAt: toLocalInput(c.submissions_close_at),
    votingOpenAt: toLocalInput(c.voting_open_at),
    votingCloseAt: toLocalInput(c.voting_close_at),
    maxEntries: c.max_entries ? String(c.max_entries) : "",
    allowVoteChange: c.allow_vote_change,
  };
}

const STATUS_STYLE: Record<LoungeChallengeStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  voting: "bg-blue-100 text-blue-600",
  closed: "bg-slate-200 text-slate-700",
  finalized: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-600",
};

const input = "w-full rounded-lg border border-border-c bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-surface";
const btn = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

export function LoungeChallengesManager({ challenges: initial, entries: initialEntries, awards }: { challenges: LoungeChallengeRow[]; entries: AdminEntry[]; awards: AdminAward[] }) {
  const [challenges, setChallenges] = React.useState(initial);
  const [entries, setEntries] = React.useState(initialEntries);
  const [editingId, setEditingId] = React.useState<string | "new" | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  function startEdit(c: LoungeChallengeRow | null) {
    setEditingId(c ? c.id : "new");
    setForm(c ? toForm(c) : { ...EMPTY });
  }

  function payload() {
    return {
      title: form.title,
      description: form.description,
      rules: form.rules,
      categories: form.categories,
      submissionsOpenAt: fromLocalInput(form.submissionsOpenAt),
      submissionsCloseAt: fromLocalInput(form.submissionsCloseAt),
      votingOpenAt: fromLocalInput(form.votingOpenAt),
      votingCloseAt: fromLocalInput(form.votingCloseAt),
      maxEntries: form.maxEntries ? Number(form.maxEntries) : null,
      allowVoteChange: form.allowVoteChange,
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const isNew = editingId === "new";
      const res = await fetch("/api/admin/lounge/challenges", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload() : { id: editingId, fields: payload() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? `${data.error} ${Object.entries(data.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ")}` : "Request failed");
      setChallenges((prev) => (isNew ? [data.challenge, ...prev] : prev.map((c) => (c.id === data.challenge.id ? data.challenge : c))));
      setEditingId(null);
      showToast("success", isNew ? "Challenge created as a draft." : "Challenge saved.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(c: LoungeChallengeRow, status: LoungeChallengeStatus) {
    if ((status === "cancelled" || status === "closed") && !(await confirm(`Set "${c.title}" to ${status}?`, "Change status"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/challenges", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setChallenges((prev) => prev.map((x) => (x.id === c.id ? data.challenge : x)));
      showToast("success", `Status: ${status}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function finalize(c: LoungeChallengeRow) {
    if (!(await confirm(`Finalize "${c.title}"? Results are computed from valid votes, winners get permanent badges and points, and members are notified. Re-running later never duplicates awards.`, "Finalize results"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lounge/challenges/${c.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      showToast("success", `Finalized. ${data.result?.newly_awarded?.length ?? 0} new award(s).`);
      window.location.reload();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function moderateEntry(entry: AdminEntry, status: "approved" | "rejected") {
    const note = status === "rejected" ? window.prompt("Reason sent to the member (optional):")?.trim() : undefined;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lounge/challenges/${entry.challenge_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: entry.id, status, note }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status } : e)));
      showToast("success", `Entry ${status}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{challenges.length} challenge(s)</p>
        <button type="button" onClick={() => startEdit(null)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-transparent bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
          <Plus size={13} /> New challenge
        </button>
      </div>

      {editingId && (
        <form onSubmit={save} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-blue-400 bg-surface p-5 sm:grid-cols-2">
          <label className="text-xs font-semibold sm:col-span-2">
            Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className={input} />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className={cn(input, "min-h-[90px]")} />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Rules &amp; eligibility
            <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className={cn(input, "min-h-[70px]")} placeholder="e.g. Only projects built in the last 6 months. One entry per member. Ties go to the earliest entry." />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Categories (comma-separated)
            <input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-semibold">
            Entries open
            <input type="datetime-local" value={form.submissionsOpenAt} onChange={(e) => setForm({ ...form, submissionsOpenAt: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-semibold">
            Entries close
            <input type="datetime-local" value={form.submissionsCloseAt} onChange={(e) => setForm({ ...form, submissionsCloseAt: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-semibold">
            Voting opens
            <input type="datetime-local" value={form.votingOpenAt} onChange={(e) => setForm({ ...form, votingOpenAt: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-semibold">
            Voting closes
            <input type="datetime-local" value={form.votingCloseAt} onChange={(e) => setForm({ ...form, votingCloseAt: e.target.value })} className={input} />
          </label>
          <label className="text-xs font-semibold">
            Max entries (blank = unlimited)
            <input type="number" min={1} value={form.maxEntries} onChange={(e) => setForm({ ...form, maxEntries: e.target.value })} className={input} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold">
            <input type="checkbox" checked={form.allowVoteChange} onChange={(e) => setForm({ ...form, allowVoteChange: e.target.checked })} /> Members may change their vote
          </label>
          <p className="text-xs text-ink-soft sm:col-span-2">Times are entered in your local time zone (Kuwait) and stored in UTC. Members see them in their own local time. Leave a field blank to rely on the status buttons alone.</p>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-5 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60">
              <Save size={13} /> {editingId === "new" ? "Create draft" : "Save"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-border-c px-5 py-2 text-xs font-semibold">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {challenges.length === 0 && <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">No challenges yet.</p>}
        {challenges.map((c) => {
          const cEntries = entries.filter((e) => e.challenge_id === c.id);
          const cAwards = awards.filter((a) => a.challenge_id === c.id);
          const isOpen = openId === c.id;
          return (
            <div key={c.id} className="rounded-2xl border border-border-c bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{c.title}</h2>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize", STATUS_STYLE[c.status])}>{c.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {cEntries.filter((e) => e.status === "approved").length} approved entries · {cEntries.reduce((s, e) => s + (e.status === "approved" ? e.vote_count : 0), 0)} votes · created {new Date(c.created_at).toLocaleDateString()}
                    {c.finalized_at && <> · finalized {new Date(c.finalized_at).toLocaleString()}</>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.status !== "finalized" && c.status !== "cancelled" && (
                    <button disabled={busy} onClick={() => startEdit(c)} className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                      Edit
                    </button>
                  )}
                  {(c.status === "draft" || c.status === "paused" || c.status === "closed") && (
                    <button disabled={busy} onClick={() => setStatus(c, "open")} className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600")}>
                      <Play size={13} /> Open entries
                    </button>
                  )}
                  {c.status === "open" && (
                    <>
                      <button disabled={busy} onClick={() => setStatus(c, "paused")} className={cn(btn, "border-border-c hover:border-amber-400 hover:text-amber-600")}>
                        <Pause size={13} /> Pause
                      </button>
                      <button disabled={busy} onClick={() => setStatus(c, "voting")} className={cn(btn, "border-blue-400 bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white")}>
                        <Vote size={13} /> Start voting
                      </button>
                    </>
                  )}
                  {c.status === "voting" && (
                    <button disabled={busy} onClick={() => setStatus(c, "closed")} className={cn(btn, "border-border-c hover:border-blue-400")}>
                      <Lock size={13} /> Close voting
                    </button>
                  )}
                  {(c.status === "voting" || c.status === "closed" || c.status === "finalized") && (
                    <button disabled={busy} onClick={() => finalize(c)} className={cn(btn, "border-purple-400 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white")}>
                      <Flag size={13} /> {c.status === "finalized" ? "Re-run finalize" : "Finalize results"}
                    </button>
                  )}
                  {c.status !== "finalized" && c.status !== "cancelled" && (
                    <button disabled={busy} onClick={() => setStatus(c, "cancelled")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
                      <Ban size={13} /> Cancel
                    </button>
                  )}
                  <a href={`/lounge/challenges/${c.id}`} target="_blank" rel="noopener" className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                    <ExternalLink size={13} /> View
                  </a>
                  <button onClick={() => setOpenId(isOpen ? null : c.id)} className={cn(btn, "border-border-c")} aria-expanded={isOpen}>
                    Entries ({cEntries.length})
                  </button>
                </div>
              </div>

              {cAwards.length > 0 && (
                <p className="mt-3 text-sm">
                  🏆{" "}
                  {cAwards
                    .sort((a, b) => a.place - b.place)
                    .map((a) => `${a.place}. ${a.member_name} (${a.badge_code}, +${a.points_awarded})`)
                    .join(" · ")}
                </p>
              )}

              {isOpen && (
                <div className="mt-4 overflow-x-auto border-t border-border-c pt-3">
                  {cEntries.length === 0 ? (
                    <p className="text-sm text-ink-soft">No entries yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                        <tr>
                          <th className="py-2 text-left">Rank</th>
                          <th className="py-2 text-left">Entry</th>
                          <th className="py-2 text-left">Member</th>
                          <th className="py-2 text-left">Votes</th>
                          <th className="py-2 text-left">Status</th>
                          <th className="py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {cEntries.map((e) => (
                          <tr key={e.id} className="border-t border-border-c">
                            <td className="py-2">{e.final_rank ?? "—"}</td>
                            <td className="py-2">
                              <a href={e.project_url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold hover:text-blue-600">
                                {e.title}
                              </a>
                            </td>
                            <td className="py-2">{e.member_name}</td>
                            <td className="py-2">{e.vote_count}</td>
                            <td className="py-2 capitalize">{e.status}</td>
                            <td className="py-2 text-right">
                              {e.status !== "approved" && e.status !== "withdrawn" && (
                                <button disabled={busy} onClick={() => moderateEntry(e, "approved")} className={cn(btn, "border-green-600/30 text-green-700")}>
                                  <Check size={12} /> Approve
                                </button>
                              )}
                              {e.status === "approved" && c.status !== "finalized" && (
                                <button disabled={busy} onClick={() => moderateEntry(e, "rejected")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
                                  <X size={12} /> Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Archive, Trash2, ChevronDown, ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import type { CourseArchiveEntry, ArchivedParticipant, ScheduleStatus } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";

export interface ArchivableCohort {
  id: string;
  courseId: string;
  courseTitle: string;
  startDate: string | null;
  endDate: string | null;
  sessionDays: string | null;
  sessionTime: string | null;
  location: string | null;
  seatsTotal: number;
  status: ScheduleStatus;
}

function participantsOf(entry: CourseArchiveEntry): ArchivedParticipant[] {
  return Array.isArray(entry.participants) ? (entry.participants as unknown as ArchivedParticipant[]) : [];
}

function cohortLabel(c: ArchivableCohort): string {
  const when = c.startDate ? formatDate(c.startDate) : "no start date";
  return `${c.courseTitle} — ${when}`;
}

export function ArchiveManager({
  initialEntries,
  cohorts,
}: {
  initialEntries: CourseArchiveEntry[];
  cohorts: ArchivableCohort[];
}) {
  const [entries, setEntries] = React.useState(initialEntries);
  const [cohortId, setCohortId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const { showToast } = useToast();
  const confirm = useConfirm();

  const selected = cohorts.find((c) => c.id === cohortId) ?? null;

  async function handleArchive() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();

    const { data: regs, error: regError } = await supabase
      .from("registrations")
      .select("full_name, email, phone, seats, amount, currency, status, created_at")
      .eq("course_schedule_id", selected.id)
      .order("created_at", { ascending: true });

    if (regError) {
      setSaving(false);
      showToast("error", regError.message);
      return;
    }

    const rows = regs ?? [];
    // "Confirmed" is what actually ran — pending/cancelled registrations are
    // still worth keeping in the roster, but shouldn't inflate the headline
    // count or the revenue figure.
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const participants: ArchivedParticipant[] = rows.map((r) => ({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      seats: r.seats,
      status: r.status,
      amount: Number(r.amount),
      registered_at: r.created_at,
    }));

    const { data: inserted, error } = await supabase
      .from("course_archive")
      .insert({
        course_id: selected.courseId,
        course_schedule_id: selected.id,
        course_title: selected.courseTitle,
        start_date: selected.startDate,
        end_date: selected.endDate,
        session_days: selected.sessionDays,
        session_time: selected.sessionTime,
        location: selected.location,
        seats_total: selected.seatsTotal,
        participants_count: rows.length,
        seats_taken: confirmed.reduce((sum, r) => sum + r.seats, 0),
        confirmed_count: confirmed.length,
        total_paid: confirmed.reduce((sum, r) => sum + Number(r.amount), 0),
        currency: rows[0]?.currency ?? "KWD",
        participants: participants as unknown as Json,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }

    setEntries((prev) => [inserted as CourseArchiveEntry, ...prev]);
    setCohortId("");
    showToast("success", `Archived — ${rows.length} participant${rows.length === 1 ? "" : "s"} recorded.`);
  }

  async function handleDelete(entry: CourseArchiveEntry) {
    if (!(await confirm(`Delete the archived record for "${entry.course_title}"? This can't be undone.`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_archive").delete().eq("id", entry.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast("success", "Archived record deleted.");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-c bg-surface-alt p-4">
        <div>
          <label htmlFor="archive-cohort" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Archive a course run
          </label>
          <select
            id="archive-cohort"
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="min-h-[38px] min-w-[300px] rounded-lg border border-border-c bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          >
            <option value="">Select a cohort…</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{cohortLabel(c)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleArchive}
          disabled={!selected || saving}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Archive size={14} aria-hidden="true" /> {saving ? "Archiving..." : "Archive this run"}
        </button>
        {selected && (
          <p className="max-w-sm text-xs text-ink-soft">
            Snapshots this cohort&apos;s dates and everyone registered in it. Safe to do more than once — each run you
            archive becomes its own record.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-5 py-3.5 text-left">#</th>
                <th className="px-5 py-3.5 text-left">Course</th>
                <th className="px-5 py-3.5 text-left">Dates</th>
                <th className="px-5 py-3.5 text-left">Days / Time</th>
                <th className="px-5 py-3.5 text-left">Participants</th>
                <th className="px-5 py-3.5 text-left">Revenue</th>
                <th className="px-5 py-3.5 text-left">Archived</th>
                <th className="px-5 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry, i) => {
                  const people = participantsOf(entry);
                  const isOpen = Boolean(expanded[entry.id]);
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="border-t border-border-c align-top">
                        <td className="px-5 py-3.5 text-xs font-semibold text-ink-soft">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold">{entry.course_title}</p>
                          {entry.location && <p className="text-xs text-ink-soft">{entry.location}</p>}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          {entry.start_date ? formatDate(entry.start_date) : "—"}
                          {entry.end_date && (
                            <>
                              <br />
                              <span className="text-xs text-ink-soft">to {formatDate(entry.end_date)}</span>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {entry.session_days || "—"}
                          {entry.session_time && (
                            <>
                              <br />
                              <span className="text-xs text-ink-soft">{entry.session_time}</span>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Users size={12} aria-hidden="true" /> {entry.confirmed_count}
                          </span>
                          {entry.participants_count !== entry.confirmed_count && (
                            <p className="mt-1 text-xs text-ink-soft">{entry.participants_count} registered total</p>
                          )}
                          {entry.seats_total != null && (
                            <p className="text-xs text-ink-soft">of {entry.seats_total} seats</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-bold text-foreground">
                          {formatMoney(Number(entry.total_paid), entry.currency)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-xs text-ink-soft">
                          {new Date(entry.archived_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? "Hide" : "Show"} participants for ${entry.course_title}`}
                              title={isOpen ? "Hide participants" : "Show participants"}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                            >
                              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              aria-label={`Delete archived record for ${entry.course_title}`}
                              title="Delete this record"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-red-300 hover:text-red-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border-c bg-surface-alt">
                          <td colSpan={8} className="px-5 py-4">
                            {people.length ? (
                              <table className="w-full text-xs">
                                <thead className="text-left text-ink-soft">
                                  <tr>
                                    <th className="py-1.5 pr-4">Name</th>
                                    <th className="py-1.5 pr-4">Email</th>
                                    <th className="py-1.5 pr-4">Phone</th>
                                    <th className="py-1.5 pr-4">Seats</th>
                                    <th className="py-1.5 pr-4">Amount</th>
                                    <th className="py-1.5">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {people.map((p, idx) => (
                                    <tr key={idx} className="border-t border-border-c/60">
                                      <td className="py-1.5 pr-4 font-semibold">{p.full_name}</td>
                                      <td className="py-1.5 pr-4">{p.email}</td>
                                      <td className="py-1.5 pr-4">{p.phone}</td>
                                      <td className="py-1.5 pr-4">{p.seats}</td>
                                      <td className="py-1.5 pr-4">{formatMoney(p.amount, entry.currency)}</td>
                                      <td className="py-1.5">
                                        <span
                                          className={cn(
                                            "rounded-full px-2 py-0.5 font-semibold",
                                            p.status === "confirmed"
                                              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                          )}
                                        >
                                          {p.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-ink-soft">No participants were registered in this run.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-ink-soft">
                    Nothing archived yet. Pick a cohort above to record your first completed run.
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

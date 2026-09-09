"use client";

import * as React from "react";
import { Printer } from "lucide-react";

export interface ScheduleOption {
  id: string;
  label: string;
}

export interface AttendanceRegistration {
  id: string;
  course_schedule_id: string;
  full_name: string;
  phone: string;
  seats: number;
  status: string;
  attendees: unknown;
}

interface AttendeeRow {
  name: string;
  phone: string;
}

/** Registrations store one row per booking (which can cover several
 *  seats), with the individual people in the jsonb attendees column —
 *  the booker is always the first entry. Flatten that out so the sheet
 *  lists one line per person actually attending, not one per booking. */
function attendeesOf(r: AttendanceRegistration): AttendeeRow[] {
  if (Array.isArray(r.attendees) && r.attendees.length) {
    const list = r.attendees
      .map((a) => {
        if (!a || typeof a !== "object") return null;
        const obj = a as Record<string, unknown>;
        const name = typeof obj.full_name === "string" ? obj.full_name.trim() : "";
        const phone = typeof obj.phone === "string" ? obj.phone.trim() : "";
        return name ? { name, phone } : null;
      })
      .filter((a): a is AttendeeRow => a !== null);
    if (list.length) return list;
  }
  // Fallback for any row saved before the attendees column existed.
  return [{ name: r.full_name, phone: r.phone }];
}

export function AttendanceSheet({
  schedules,
  registrations,
}: {
  schedules: ScheduleOption[];
  registrations: AttendanceRegistration[];
}) {
  const [scheduleId, setScheduleId] = React.useState(schedules[0]?.id ?? "");
  const [includePending, setIncludePending] = React.useState(false);

  const rows = React.useMemo(() => {
    const filtered = registrations.filter(
      (r) =>
        r.course_schedule_id === scheduleId &&
        (r.status === "confirmed" || (includePending && r.status === "pending"))
    );
    return filtered.flatMap(attendeesOf);
  }, [registrations, scheduleId, includePending]);

  const scheduleLabel = schedules.find((s) => s.id === scheduleId)?.label ?? "";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border-c bg-surface-alt p-4 print:hidden">
        <div>
          <label htmlFor="attendance-schedule" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Course date
          </label>
          <select
            id="attendance-schedule"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className="min-h-[38px] min-w-[280px] rounded-lg border border-border-c bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          >
            {schedules.length === 0 && <option value="">No cohorts yet</option>}
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <label className="flex min-h-[38px] items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={includePending} onChange={(e) => setIncludePending(e.target.checked)} />
          Include pending (not yet paid)
        </label>
        <button
          onClick={() => window.print()}
          disabled={rows.length === 0}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer size={14} aria-hidden="true" /> Print ({rows.length})
        </button>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-6 print:rounded-none print:border-0 print:p-0">
        <div className="mb-5 hidden print:block">
          <h2 className="text-xl font-bold">{scheduleLabel}</h2>
          <p className="text-sm text-ink-soft">
            Attendance Sheet — {rows.length} attendee{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-border-c text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
              <th className="w-10 py-2 pr-3">#</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Mobile</th>
              <th className="py-2">Signature</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((a, i) => (
                <tr key={i} className="border-b border-border-c">
                  <td className="py-4 pr-3 text-ink-soft">{i + 1}</td>
                  <td className="py-4 pr-3 font-semibold">{a.name}</td>
                  <td className="py-4 pr-3">{a.phone}</td>
                  <td className="py-4">&nbsp;</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-ink-soft print:hidden">
                  No {includePending ? "" : "confirmed "}registrants for this cohort yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

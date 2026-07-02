"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseSchedule, CourseWithRelations, ScheduleStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";

type Row = CourseSchedule & { courseTitle: string };

export function ScheduleManager({ courses }: { courses: CourseWithRelations[] }) {
  const [rows, setRows] = React.useState<Row[]>(
    courses.flatMap((c) => c.schedules.map((s) => ({ ...s, courseTitle: c.title })))
  );
  const [editing, setEditing] = React.useState<{ courseId: string; courseTitle: string; schedule: CourseSchedule | null } | null>(null);

  function upsertRow(courseTitle: string, schedule: CourseSchedule) {
    setRows((prev) => {
      const exists = prev.some((r) => r.id === schedule.id);
      const next = exists
        ? prev.map((r) => (r.id === schedule.id ? { ...schedule, courseTitle } : r))
        : [...prev, { ...schedule, courseTitle }];
      return next.sort((a, b) => (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999"));
    });
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <select
          defaultValue=""
          aria-label="Add cohort to course"
          onChange={(e) => {
            const course = courses.find((c) => c.id === e.target.value);
            if (course) setEditing({ courseId: course.id, courseTitle: course.title, schedule: null });
            e.target.value = "";
          }}
          className="rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white outline-none"
        >
          <option value="" disabled>+ Add Cohort to Course...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface text-foreground">{c.title}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-6 py-3.5 text-left">Course</th>
                <th className="px-6 py-3.5 text-left">Start Date</th>
                <th className="px-6 py-3.5 text-left">End Date</th>
                <th className="px-6 py-3.5 text-left">Days</th>
                <th className="px-6 py-3.5 text-left">Time</th>
                <th className="px-6 py-3.5 text-left">Seats</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border-c">
                    <td className="px-6 py-3.5 font-medium">{r.courseTitle}</td>
                    <td className="px-6 py-3.5">{formatDate(r.start_date)}</td>
                    <td className="px-6 py-3.5">{formatDate(r.end_date)}</td>
                    <td className="px-6 py-3.5">{r.session_days}</td>
                    <td className="px-6 py-3.5">{r.session_time}</td>
                    <td className="px-6 py-3.5">{r.seats_available}/{r.seats_total}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">{r.status}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => setEditing({ courseId: r.course_id, courseTitle: r.courseTitle, schedule: r })}
                        aria-label={`Edit schedule for ${r.courseTitle}`}
                        title="Edit schedule"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600"
                      >
                        <CalendarClock size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-ink-soft">No cohorts scheduled yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ScheduleModal
          courseId={editing.courseId}
          courseTitle={editing.courseTitle}
          schedule={editing.schedule}
          onClose={() => setEditing(null)}
          onSaved={(schedule) => {
            upsertRow(editing.courseTitle, schedule);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  courseId,
  courseTitle,
  schedule,
  onClose,
  onSaved,
}: {
  courseId: string;
  courseTitle: string;
  schedule: CourseSchedule | null;
  onClose: () => void;
  onSaved: (schedule: CourseSchedule) => void;
}) {
  const [startDate, setStartDate] = React.useState(schedule?.start_date ?? "");
  const [endDate, setEndDate] = React.useState(schedule?.end_date ?? "");
  const [days, setDays] = React.useState(schedule?.session_days ?? "");
  const [time, setTime] = React.useState(schedule?.session_time ?? "");
  const [seatsTotal, setSeatsTotal] = React.useState(schedule?.seats_total ?? 20);
  const [status, setStatus] = React.useState<ScheduleStatus>(schedule?.status ?? "upcoming");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const payload = {
      course_id: courseId,
      start_date: startDate || null,
      end_date: endDate || null,
      session_days: days,
      session_time: time,
      seats_total: seatsTotal,
      status,
    };

    const query = schedule
      ? supabase
          .from("course_schedule")
          .update({ ...payload, seats_available: Math.max(0, seatsTotal - (schedule.seats_total - schedule.seats_available)) })
          .eq("id", schedule.id)
          .select()
          .single()
      : supabase.from("course_schedule").insert({ ...payload, seats_available: seatsTotal }).select().single();

    const { data, error } = await query;
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved(data as CourseSchedule);
  }

  useCloseOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/55 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" className="w-full max-w-[440px] rounded-[22px] bg-surface p-8 shadow-2xl">
        <h3 id="schedule-modal-title" className="mb-5.5 text-lg font-bold">{schedule ? "Edit Cohort" : "New Cohort"} — {courseTitle}</h3>
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="s-start" className="mb-1.5 block text-[13.5px] font-semibold">Start Date</label>
            <input id="s-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-end" className="mb-1.5 block text-[13.5px] font-semibold">End Date</label>
            <input id="s-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-days" className="mb-1.5 block text-[13.5px] font-semibold">Session Days</label>
            <input id="s-days" required value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. Sun, Tue" className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-time" className="mb-1.5 block text-[13.5px] font-semibold">Session Time</label>
            <input id="s-time" required value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 6:00 PM - 9:00 PM" className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-seats" className="mb-1.5 block text-[13.5px] font-semibold">Total Seats</label>
            <input id="s-seats" type="number" min={1} required value={seatsTotal} onChange={(e) => setSeatsTotal(parseInt(e.target.value) || 1)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="s-status" className="mb-1.5 block text-[13.5px] font-semibold">Status</label>
            <select id="s-status" value={status} onChange={(e) => setStatus(e.target.value as ScheduleStatus)} className={inputClass}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Cohort"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";

"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Course, CourseStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ScheduleManager({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [editing, setEditing] = React.useState<Course | null>(null);

  return (
    <div>
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
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length ? (
                courses.map((c) => (
                  <tr key={c.id} className="border-t border-border-c">
                    <td className="px-6 py-3.5 font-medium">{c.title}</td>
                    <td className="px-6 py-3.5">{formatDate(c.start_date)}</td>
                    <td className="px-6 py-3.5">{formatDate(c.end_date)}</td>
                    <td className="px-6 py-3.5">{c.session_days}</td>
                    <td className="px-6 py-3.5">{c.session_time}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">{c.status}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <button onClick={() => setEditing(c)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600">
                        <CalendarClock size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-ink-soft">No courses to schedule yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ScheduleModal
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onSaved: (course: Course) => void;
}) {
  const [startDate, setStartDate] = React.useState(course.start_date ?? "");
  const [endDate, setEndDate] = React.useState(course.end_date ?? "");
  const [days, setDays] = React.useState(course.session_days ?? "");
  const [time, setTime] = React.useState(course.session_time ?? "");
  const [status, setStatus] = React.useState<CourseStatus>(course.status);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .update({ start_date: startDate, end_date: endDate, session_days: days, session_time: time, status })
      .eq("id", course.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved(data as Course);
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/55 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[440px] rounded-[22px] bg-surface p-8 shadow-2xl">
        <h3 className="mb-5.5 text-lg font-bold">Edit Schedule — {course.title}</h3>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Start Date</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">End Date</label>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Session Days</label>
            <input required value={days} onChange={(e) => setDays(e.target.value)} placeholder="e.g. Sun, Tue" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Session Time</label>
            <input required value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 6:00 PM - 9:00 PM" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as CourseStatus)} className={inputClass}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { formatDate } from "@/lib/utils";
import { AttendanceSheet, type ScheduleOption, type AttendanceRegistration } from "@/components/admin/attendance-sheet";

export const metadata: Metadata = { title: "Attendance Sheet" };

interface ScheduleDbRow {
  id: string;
  start_date: string;
  courses: { title: string } | { title: string }[] | null;
}

export default async function AdminAttendancePage() {
  let schedules: ScheduleOption[] = [];
  let registrations: AttendanceRegistration[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: scheduleRows }, { data: regRows }] = await Promise.all([
      supabase
        .from("course_schedule")
        .select("id, start_date, courses(title)")
        .order("start_date", { ascending: false }),
      supabase
        .from("registrations")
        .select("id, course_schedule_id, full_name, phone, seats, status, attendees")
        .in("status", ["confirmed", "pending"]),
    ]);

    schedules = ((scheduleRows as unknown as ScheduleDbRow[]) ?? []).map((s) => {
      const c = Array.isArray(s.courses) ? s.courses[0] : s.courses;
      return { id: s.id, label: `${c?.title ?? "Untitled course"} — ${formatDate(s.start_date)}` };
    });
    registrations = (regRows as unknown as AttendanceRegistration[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold print:hidden">Attendance Sheet</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft print:hidden">
        Pick a course date to generate a printable sign-in sheet — name, mobile number, and a signature column for
        every registered attendee.
      </p>
      <AttendanceSheet schedules={schedules} registrations={registrations} />
    </div>
  );
}

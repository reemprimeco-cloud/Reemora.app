import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

interface RegistrationRow {
  id: string;
  full_name: string;
  seats: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  course_schedule: { courses: { title: string } | { title: string }[] | null } | { courses: { title: string } | { title: string }[] | null }[] | null;
}

function courseTitleOf(r: RegistrationRow): string {
  const sched = Array.isArray(r.course_schedule) ? r.course_schedule[0] : r.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? "—";
}

export default async function AdminDashboardPage() {
  let courseCount = 0;
  let upcomingCohorts = 0;
  let registrations: RegistrationRow[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ count: cCount }, { count: uCount }, { data: regs }] = await Promise.all([
      supabase.from("courses").select("*", { count: "exact", head: true }),
      supabase.from("course_schedule").select("*", { count: "exact", head: true }).eq("status", "upcoming"),
      supabase
        .from("registrations")
        .select("id, full_name, seats, amount, currency, status, created_at, course_schedule(courses(title))")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    courseCount = cCount ?? 0;
    upcomingCohorts = uCount ?? 0;
    registrations = (regs as unknown as RegistrationRow[]) ?? [];
  }

  const totalSeats = registrations.reduce((sum, r) => sum + r.seats, 0);

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Kpi label="Total Courses" value={courseCount} />
        <Kpi label="Upcoming Cohorts" value={upcomingCohorts} />
        <Kpi label="Recent Registrations" value={registrations.length} />
        <Kpi label="Seats Booked (recent)" value={totalSeats} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="border-b border-border-c px-6 py-5">
          <h2 className="font-bold">Recent Registrations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-6 py-3.5 text-left">Participant</th>
                <th className="px-6 py-3.5 text-left">Course</th>
                <th className="px-6 py-3.5 text-left">Seats</th>
                <th className="px-6 py-3.5 text-left">Amount</th>
                <th className="px-6 py-3.5 text-left">Status</th>
                <th className="px-6 py-3.5 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {registrations.length ? (
                registrations.map((r) => (
                  <tr key={r.id} className="border-t border-border-c">
                    <td className="px-6 py-3.5">{r.full_name}</td>
                    <td className="px-6 py-3.5">{courseTitleOf(r)}</td>
                    <td className="px-6 py-3.5">{r.seats}</td>
                    <td className="px-6 py-3.5">{formatMoney(r.amount, r.currency)}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">{r.status}</span>
                    </td>
                    <td className="px-6 py-3.5">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-soft">No registrations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5.5">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      <strong className="mt-2 block font-[family-name:var(--font-head)] text-[28px]">{value}</strong>
    </div>
  );
}

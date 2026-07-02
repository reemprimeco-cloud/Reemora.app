import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { formatMoney } from "@/lib/utils";

interface RegistrationRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
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

export default async function AdminRegistrationsPage() {
  let registrations: RegistrationRow[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("registrations")
      .select("id, full_name, email, phone, seats, amount, currency, status, created_at, course_schedule(courses(title))")
      .order("created_at", { ascending: false });
    registrations = (data as unknown as RegistrationRow[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Registrations</h1>
      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-6 py-3.5 text-left">Student</th>
                <th className="px-6 py-3.5 text-left">Email</th>
                <th className="px-6 py-3.5 text-left">Phone</th>
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
                    <td className="px-6 py-3.5">{r.email}</td>
                    <td className="px-6 py-3.5">{r.phone}</td>
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
                  <td colSpan={8} className="px-6 py-8 text-center text-ink-soft">No registrations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { RegistrationsTable, type RegistrationRow } from "@/components/admin/registrations-table";
import type { RegistrationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Registrations" };

interface DbRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  seats: number;
  amount: number;
  currency: string;
  status: RegistrationStatus;
  created_at: string;
  course_schedule:
    | { courses: { title: string } | { title: string }[] | null }
    | { courses: { title: string } | { title: string }[] | null }[]
    | null;
}

function courseTitleOf(r: DbRow): string {
  const sched = Array.isArray(r.course_schedule) ? r.course_schedule[0] : r.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? "—";
}

export default async function AdminRegistrationsPage() {
  let rows: RegistrationRow[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("registrations")
      .select("id, full_name, email, phone, seats, amount, currency, status, created_at, course_schedule(courses(title))")
      .order("created_at", { ascending: false });
    const raw = (data as unknown as DbRow[]) ?? [];
    rows = raw.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      seats: r.seats,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      created_at: r.created_at,
      course_title: courseTitleOf(r),
    }));
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Registrations</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Use the status dropdown on each row to move a registration through Pending → Accepted → Cancelled / Refunded / No-show / Waitlist. Status is a label only — it does not free seats or issue refunds. Free a seat by editing the schedule; process refunds inside MyFatoorah.
      </p>
      <RegistrationsTable initialRows={rows} />
    </div>
  );
}

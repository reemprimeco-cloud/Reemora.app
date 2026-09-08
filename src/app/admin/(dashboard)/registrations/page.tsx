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
  course_schedule_id: string;
  payment_plan: "full" | "installments" | null;
  amount_paid: number | null;
  course_schedule:
    | { courses: { title: string } | { title: string }[] | null }
    | { courses: { title: string } | { title: string }[] | null }[]
    | null;
  payments: PaymentLite | PaymentLite[] | null;
}

interface PaymentLite {
  id: string;
  method: string;
  installment_no: number;
  status: string;
  due_date: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
}

function courseTitleOf(r: DbRow): string {
  const sched = Array.isArray(r.course_schedule) ? r.course_schedule[0] : r.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? "—";
}

function paymentsOf(r: DbRow): PaymentLite[] {
  if (!r.payments) return [];
  return Array.isArray(r.payments) ? r.payments : [r.payments];
}

function paymentMethodOf(r: DbRow): string | null {
  return paymentsOf(r)[0]?.method ?? null;
}

function secondInstallmentOf(r: DbRow): RegistrationRow["second_installment"] {
  const p = paymentsOf(r).find((x) => x.installment_no === 2);
  if (!p) return null;
  return {
    id: p.id,
    status: p.status,
    due_date: p.due_date,
    reminder_count: p.reminder_count,
    last_reminder_at: p.last_reminder_at,
  };
}

export default async function AdminRegistrationsPage() {
  let rows: RegistrationRow[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("registrations")
      .select(
        "id, full_name, email, phone, seats, amount, currency, status, created_at, course_schedule_id, payment_plan, amount_paid, course_schedule(courses(title)), payments(id, method, installment_no, status, due_date, reminder_count, last_reminder_at)"
      )
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
      course_schedule_id: r.course_schedule_id,
      payment_method: paymentMethodOf(r),
      payment_plan: r.payment_plan ?? "full",
      amount_paid: Number(r.amount_paid ?? 0),
      second_installment: secondInstallmentOf(r),
    }));
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Registrations</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Use the status dropdown on each row to move a registration through Pending → Accepted → Cancelled / Refunded / No-show / Waitlist. For UPayments registrations, status is a label only — seats are reserved automatically when the (first) payment clears. For WhatsApp (manual) registrations, moving to Accepted reserves a seat and moving away from it releases the seat back, since there&apos;s no gateway callback to do that for you. Installment plans show the paid/remaining balance and the second-installment due date; reminders go out by SMS automatically (3 days before, then every 3 days), or use <strong>Remind</strong> to send one now.
      </p>
      <RegistrationsTable initialRows={rows} />
    </div>
  );
}

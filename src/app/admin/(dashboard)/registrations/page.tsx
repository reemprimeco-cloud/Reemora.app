import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { reconcilePendingUPayments } from "@/lib/payment-reconciliation";
import { RegistrationsTable, type RegistrationRow } from "@/components/admin/registrations-table";
import type { RegistrationStatus, PaymentPlan } from "@/lib/types";

export const metadata: Metadata = { title: "Registrations" };
export const dynamic = "force-dynamic";

interface DbPayment {
  method: string;
  amount: number;
  status: string;
  due_date: string | null;
}

interface DbRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  seats: number;
  amount: number;
  currency: string;
  status: RegistrationStatus;
  payment_plan: PaymentPlan;
  created_at: string;
  course_schedule_id: string;
  course_schedule:
    | { courses: { title: string } | { title: string }[] | null }
    | { courses: { title: string } | { title: string }[] | null }[]
    | null;
  payments: DbPayment | DbPayment[] | null;
}

function courseTitleOf(r: DbRow): string {
  const sched = Array.isArray(r.course_schedule) ? r.course_schedule[0] : r.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? "—";
}

function paymentsOf(r: DbRow): DbPayment[] {
  return Array.isArray(r.payments) ? r.payments : r.payments ? [r.payments] : [];
}

/** The first installment (due_date null) — for a full payment this is the
 *  only row; for a split plan it's the one charged at checkout. */
function paymentMethodOf(r: DbRow): string | null {
  const payments = paymentsOf(r);
  return payments.find((p) => p.due_date === null)?.method ?? payments[0]?.method ?? null;
}

/** The deferred second half of a split plan, if any. */
function secondInstallmentOf(r: DbRow): RegistrationRow["second_installment"] {
  if (r.payment_plan !== "split_50_50") return null;
  const second = paymentsOf(r).find((p) => p.due_date !== null);
  if (!second) return null;
  return { amount: second.amount, status: second.status, due_date: second.due_date };
}

export default async function AdminRegistrationsPage() {
  let rows: RegistrationRow[] = [];

  if (isSupabaseConfigured) {
    // Ask UPayments directly about anything still pending before rendering.
    // UPayments' return redirect and notification webhook have both been
    // observed failing to arrive in production, which left genuinely paid
    // registrations stuck on "pending"; this makes opening the page enough
    // to settle them.
    await reconcilePendingUPayments();

    const supabase = await createClient();
    const { data } = await supabase
      .from("registrations")
      .select(
        "id, full_name, email, phone, seats, amount, currency, status, payment_plan, created_at, course_schedule_id, course_schedule(courses(title)), payments(method, amount, status, due_date)"
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
      payment_plan: r.payment_plan,
      second_installment: secondInstallmentOf(r),
    }));
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Registrations</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Use the status dropdown on each row to move a registration through Pending → Accepted → Cancelled / Refunded / No-show / Waitlist. For UPayments registrations, status is a label only — seats are freed/reserved automatically by the payment webhook. For WhatsApp (manual) registrations, moving to Accepted reserves a seat and moving away from it releases the seat back, since there&apos;s no webhook to do that for you.
      </p>
      <RegistrationsTable initialRows={rows} />
    </div>
  );
}

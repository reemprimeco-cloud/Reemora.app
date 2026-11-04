import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { reconcilePendingUPayments } from "@/lib/payment-reconciliation";

import { InstallAdminApp } from "@/components/admin/install-admin-app";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Course = { title: string; title_ar: string | null; price: number; currency: string; is_published: boolean; registration_open: boolean };

interface CohortRow {
  id: string;
  start_date: string | null;
  status: string;
  seats_total: number;
  seats_available: number;
  courses: Course | Course[] | null;
  registrations: { seats: number; status: string; amount: number }[] | null;
}

interface Cohort {
  id: string;
  title: string;
  startDate: string | null;
  status: string;
  open: boolean;
  seatsTotal: number;
  seatsLeft: number;
  /** Registrations still in play (pending + accepted). */
  registered: number;
  confirmed: number;
  pending: number;
  revenue: number;
  currency: string;
  price: number;
}

function toCohort(row: CohortRow): Cohort | null {
  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  if (!course) return null;
  const regs = row.registrations ?? [];
  const active = regs.filter((r) => r.status === "pending" || r.status === "confirmed");
  const confirmed = regs.filter((r) => r.status === "confirmed");
  return {
    id: row.id,
    title: course.title_ar?.trim() || course.title,
    startDate: row.start_date,
    status: row.status,
    open: course.is_published && course.registration_open && row.status !== "completed" && row.status !== "cancelled",
    seatsTotal: row.seats_total,
    seatsLeft: row.seats_available,
    registered: active.reduce((n, r) => n + r.seats, 0),
    confirmed: confirmed.reduce((n, r) => n + r.seats, 0),
    pending: regs.filter((r) => r.status === "pending").reduce((n, r) => n + r.seats, 0),
    revenue: confirmed.reduce((n, r) => n + Number(r.amount || 0), 0),
    currency: course.currency,
    price: Number(course.price),
  };
}

/** Arabic month names with Western digits, so dates match the counts on
 *  the same card (e.g. "19 نوفمبر 2026"). */
function arDate(dateStr: string | null): string {
  if (!dateStr) return "التاريخ لم يُحدد";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-KW-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
}

function arMoney(amount: number, currency: string): string {
  const kwd = currency.toUpperCase() === "KWD";
  return `${amount.toFixed(kwd ? 3 : 2)} ${kwd ? "د.ك" : currency}`;
}

export default async function AdminDashboardPage() {
  let cohorts: Cohort[] = [];

  if (isSupabaseConfigured) {
    // Same settle-before-render as the Registrations page, so the two
    // never disagree about whether someone has paid.
    await reconcilePendingUPayments();

    const supabase = await createClient();
    const { data } = await supabase
      .from("course_schedule")
      .select("id, start_date, status, seats_total, seats_available, courses(title, title_ar, price, currency, is_published, registration_open), registrations(seats, status, amount)")
      .order("start_date", { ascending: true });
    cohorts = ((data as unknown as CohortRow[]) ?? []).map(toCohort).filter((c): c is Cohort => c !== null);
  }

  const open = cohorts.filter((c) => c.open);
  const today = new Date().toISOString().slice(0, 10);
  // Not taking registrations, but still running or about to: worth a glance.
  const others = cohorts.filter(
    (c) => !c.open && (c.status === "ongoing" || (c.status === "upcoming" && (!c.startDate || c.startDate >= today)))
  );
  const totalRegistered = open.reduce((n, c) => n + c.registered, 0);

  return (
    <div dir="rtl" lang="ar">
      <h1 className="mb-7 text-2xl font-bold">لوحة التحكم</h1>
      <InstallAdminApp compact />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:gap-5">
        <Kpi label="دورات مفتوحة للتسجيل" value={open.length} />
        <Kpi label="المسجلون في الدورات المفتوحة" value={totalRegistered} />
      </div>

      <h2 className="mb-4 text-lg font-bold">مفتوحة للتسجيل</h2>
      {open.length ? (
        <div className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map((c) => (
            <OpenCohortCard key={c.id} cohort={c} />
          ))}
        </div>
      ) : (
        <p className="mb-10 rounded-2xl border border-dashed border-border-c bg-surface px-6 py-8 text-center text-sm text-ink-soft">
          لا توجد دورة مفتوحة للتسجيل حالياً. يمكنك فتح التسجيل من صفحة الدورات.
        </p>
      )}

      {others.length > 0 && (
        <>
          <h2 className="mb-4 text-lg font-bold">دورات قادمة أو جارية أخرى</h2>
          <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
            {others.map((c, i) => (
              <Link
                key={c.id}
                href={`/admin/registrations?course=${c.id}`}
                className={`flex items-center gap-4 px-5 py-4 transition hover:bg-surface-alt ${i ? "border-t border-border-c" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="text-xs text-ink-soft">
                    {arDate(c.startDate)} · {c.status === "ongoing" ? "جارية الآن" : "التسجيل مغلق"}
                  </p>
                </div>
                <span className="shrink-0 text-center">
                  <strong className="block text-lg leading-none">{c.registered}</strong>
                  <span className="text-[11px] text-ink-soft">مسجّل</span>
                </span>
                <ArrowLeft size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OpenCohortCard({ cohort: c }: { cohort: Cohort }) {
  const booked = Math.max(0, c.seatsTotal - c.seatsLeft);
  const pct = c.seatsTotal ? Math.min(100, Math.round((booked / c.seatsTotal) * 100)) : 0;
  const isFree = c.price <= 0;
  return (
    <div className="flex flex-col rounded-2xl border border-border-c bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-snug">{c.title}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <CalendarDays size={14} aria-hidden="true" /> {arDate(c.startDate)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
          مفتوحة
        </span>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <strong className="font-[family-name:var(--font-head)] text-[44px] leading-none">{c.registered}</strong>
        <span className="mb-1 text-sm text-ink-soft">مسجّل</span>
      </div>

      <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-surface-alt" aria-hidden="true">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        {booked} من {c.seatsTotal} مقعد محجوز · <strong className="text-foreground">متبقي {c.seatsLeft}</strong>
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2 text-center">
        <Stat label="مقبول" value={String(c.confirmed)} />
        <Stat label="قيد الانتظار" value={String(c.pending)} />
        <Stat label={isFree ? "السعر" : "المحصّل"} value={isFree ? "مجانية" : arMoney(c.revenue, c.currency)} />
      </div>

      <Link
        href={`/admin/registrations?course=${c.id}`}
        className="mt-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-navy-800 px-5 text-sm font-semibold text-white transition hover:bg-blue-600"
      >
        <Users size={15} aria-hidden="true" /> عرض المشاركين
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-alt px-2 py-2.5">
      <strong className="block truncate text-[15px]">{value}</strong>
      <span className="text-[11px] text-ink-soft">{label}</span>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border-c bg-surface p-5">
      <span className="text-[13px] font-bold text-ink-soft">{label}</span>
      <strong className="mt-2 block font-[family-name:var(--font-head)] text-[28px]">{value}</strong>
    </div>
  );
}

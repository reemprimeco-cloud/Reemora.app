"use client";

import * as React from "react";
import { MessageCircle, Phone, Trash2, BellOff, Printer, Mail, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney } from "@/lib/utils";
import { type MailClient, mailtoAllHref, openGmail, readMailClient, storeMailClient } from "@/lib/admin/mail";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import type { RegistrationStatus, PaymentPlan } from "@/lib/types";

function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export interface RegistrationRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  seats: number;
  amount: number;
  currency: string;
  status: RegistrationStatus;
  created_at: string;
  course_title: string;
  course_schedule_id: string;
  /** Cohort start date, used to tell two runs of the same course apart. */
  start_date: string | null;
  /** Null for older rows saved before payments.method existed. */
  payment_method: string | null;
  payment_plan: PaymentPlan;
  /** The deferred second half of a split plan — null unless payment_plan
   *  is 'split_50_50' and a second payments row exists. */
  second_installment: { id: string; amount: number; status: string; due_date: string | null } | null;
}

/** Status vocabulary the admin can pick from. Order = order in the
 *  dropdown. Labels are UX-facing (DB value stays 'confirmed' but we call
 *  it "Accepted" because that's what the trainer thinks of it as). */
const STATUS_OPTIONS: { value: RegistrationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Accepted" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "no_show", label: "No-show" },
  { value: "waitlist", label: "Waitlist" },
];

const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: "bg-blue-100 text-blue-600",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  refunded: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  no_show: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  waitlist: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
};

function statusLabel(status: RegistrationStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/** Registrations still counting toward the class list. */
const ACTIVE: RegistrationStatus[] = ["pending", "confirmed", "waitlist"];
const COURSE_KEY = "admin.registrationsCourse";

interface CourseGroup {
  scheduleId: string;
  title: string;
  startDate: string | null;
  count: number;
  latest: string;
}

function groupByCourse(rows: RegistrationRow[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();
  for (const r of rows) {
    const g = map.get(r.course_schedule_id);
    if (g) {
      g.count += 1;
      if (r.created_at > g.latest) g.latest = r.created_at;
    } else {
      map.set(r.course_schedule_id, { scheduleId: r.course_schedule_id, title: r.course_title, startDate: r.start_date, count: 1, latest: r.created_at });
    }
  }
  // Courses with the newest registration first.
  return [...map.values()].sort((a, b) => b.latest.localeCompare(a.latest));
}

export function RegistrationsTable({
  initialRows,
  adminEmail,
  initialCourseId,
}: {
  initialRows: RegistrationRow[];
  adminEmail: string;
  /** Course cohort to open on (e.g. from a dashboard card); wins over the remembered one. */
  initialCourseId?: string;
}) {
  const [rows, setRows] = React.useState(initialRows);
  const groups = React.useMemo(() => groupByCourse(rows), [rows]);
  const [courseId, setCourseId] = React.useState<string>(() =>
    initialCourseId && groups.some((g) => g.scheduleId === initialCourseId) ? initialCourseId : groups[0]?.scheduleId ?? ""
  );
  const [mailClient, setMailClient] = React.useState<MailClient>("default");
  React.useEffect(() => {
    setMailClient(readMailClient());
    try {
      if (initialCourseId && groups.some((g) => g.scheduleId === initialCourseId)) return;
      const saved = window.localStorage.getItem(COURSE_KEY);
      if (saved && groups.some((g) => g.scheduleId === saved)) setCourseId(saved);
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Keep a valid selection if the chosen course loses its last registration.
  React.useEffect(() => {
    if (groups.length && !groups.some((g) => g.scheduleId === courseId)) setCourseId(groups[0].scheduleId);
  }, [groups, courseId]);
  function chooseCourse(id: string) {
    setCourseId(id);
    try {
      window.localStorage.setItem(COURSE_KEY, id);
    } catch {
      /* private mode */
    }
  }
  const group = groups.find((g) => g.scheduleId === courseId) ?? null;
  const courseRows = React.useMemo(() => rows.filter((r) => r.course_schedule_id === courseId), [rows, courseId]);
  const activeRows = courseRows.filter((r) => ACTIVE.includes(r.status));
  const confirmedSeats = courseRows.filter((r) => r.status === "confirmed").reduce((n, r) => n + r.seats, 0);
  const emails = Array.from(new Set(activeRows.map((r) => r.email.trim().toLowerCase()).filter(Boolean)));
  const phones = Array.from(new Set(activeRows.map((r) => r.phone.trim()).filter(Boolean)));
  const courseLabel = group ? `${group.title}${group.startDate ? ` — ${formatDate(group.startDate)}` : ""}` : "";
  const mailSubject = group ? `Reemora — ${group.title}` : "";
  const mailBody = group ? ["Hi there,", "", `A quick note about "${group.title}"${group.startDate ? ` on ${formatDate(group.startDate)}` : ""}:`, "", "", "See you soon,", "Reemora Training"].join("\n") : "";

  async function copyList(list: string[], what: string) {
    try {
      await navigator.clipboard.writeText(list.join(what === "phones" ? "\n" : ", "));
      showToast("success", `Copied ${list.length} ${what}.`);
    } catch {
      showToast("error", "Could not copy. Select them manually.");
    }
  }
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = React.useState<Record<string, boolean>>({});
  const [waiving, setWaiving] = React.useState<Record<string, boolean>>({});
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function changeStatus(id: string, next: RegistrationStatus) {
    const prev = rows.find((r) => r.id === id);
    if (!prev || prev.status === next) return;

    // Optimistic — flip immediately, roll back if the update fails.
    setRows((current) => current.map((r) => (r.id === id ? { ...r, status: next } : r)));
    setSaving((s) => ({ ...s, [id]: true }));

    const supabase = createClient();
    const { error } = await supabase.from("registrations").update({ status: next }).eq("id", id);

    if (error) {
      setSaving((s) => {
        const { [id]: _omit, ...rest } = s;
        void _omit;
        return rest;
      });
      setRows((current) => current.map((r) => (r.id === id ? { ...r, status: prev.status } : r)));
      showToast("error", error.message);
      return;
    }

    // WhatsApp-manual registrations never hit a UPayments webhook, so
    // there's nothing else to decrement/release a seat when payment is
    // confirmed by hand. Only adjust for that payment method — UPayments
    // registrations already get this from the payment callback, and
    // adjusting here too would double-count.
    let seatMessage = "";
    if (prev.payment_method === "whatsapp_manual") {
      const enteringConfirmed = prev.status !== "confirmed" && next === "confirmed";
      const leavingConfirmed = prev.status === "confirmed" && next !== "confirmed";
      if (enteringConfirmed || leavingConfirmed) {
        const delta = enteringConfirmed ? -prev.seats : prev.seats;
        const { error: seatError } = await supabase.rpc("adjust_seats_available", {
          p_schedule_id: prev.course_schedule_id,
          p_delta: delta,
        });
        if (seatError) {
          showToast("error", `Status updated, but seat count couldn't be adjusted: ${seatError.message}`);
        } else {
          seatMessage = enteringConfirmed ? " Seat reserved." : " Seat released back.";
        }
      }
    }

    setSaving((s) => {
      const { [id]: _omit, ...rest } = s;
      void _omit;
      return rest;
    });
    showToast("success", `Status updated to ${statusLabel(next)}.${seatMessage}`);
  }

  async function handleDelete(r: RegistrationRow) {
    if (
      !(await confirm(
        `Delete the registration for "${r.full_name}" (${r.course_title})? This also removes its payment records. This can't be undone.`
      ))
    )
      return;

    setDeleting((d) => ({ ...d, [r.id]: true }));
    const supabase = createClient();
    const { error } = await supabase.from("registrations").delete().eq("id", r.id);

    if (error) {
      setDeleting((d) => {
        const { [r.id]: _omit, ...rest } = d;
        void _omit;
        return rest;
      });
      showToast("error", error.message);
      return;
    }

    setRows((current) => current.filter((it) => it.id !== r.id));
    showToast("success", "Registration deleted.");
  }

  async function handleWaiveInstallment(r: RegistrationRow) {
    const installment = r.second_installment;
    if (!installment) return;
    if (
      !(await confirm(
        `Waive the remaining ${formatMoney(installment.amount, r.currency)} for "${r.full_name}"? They will not be charged for it and the reminder job will stop chasing this payment. This can't be undone from here.`
      ))
    )
      return;

    setWaiving((w) => ({ ...w, [r.id]: true }));
    try {
      const res = await fetch("/api/admin/payments/cancel-installment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: installment.id, reason: "Withdrew after paying the first installment" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showToast("error", data.error || "Couldn't waive this installment.");
        return;
      }
      setRows((current) =>
        current.map((row) =>
          row.id === r.id && row.second_installment
            ? { ...row, second_installment: { ...row.second_installment, status: "cancelled" } }
            : row
        )
      );
      showToast("success", "Remaining installment waived — it won't be charged or chased again.");
    } catch {
      showToast("error", "Couldn't waive this installment.");
    } finally {
      setWaiving((w) => {
        const { [r.id]: _omit, ...rest } = w;
        void _omit;
        return rest;
      });
    }
  }

  if (!groups.length) {
    return <p className="rounded-2xl border border-border-c bg-surface px-6 py-10 text-center text-ink-soft">No registrations yet.</p>;
  }

  return (
    <div>
      {/* Course picker: one list per course, never mixed. */}
      <div role="tablist" aria-label="Course" className="mb-4 flex gap-2 overflow-x-auto pb-1 print:hidden">
        {groups.map((g) => {
          const active = g.scheduleId === courseId;
          return (
            <button
              key={g.scheduleId}
              role="tab"
              aria-selected={active}
              onClick={() => chooseCourse(g.scheduleId)}
              className={cn(
                "flex min-h-[44px] shrink-0 flex-col items-start rounded-xl border px-4 py-2 text-left transition",
                active ? "border-navy-800 bg-navy-800 text-white" : "border-border-c bg-surface text-foreground hover:border-blue-400"
              )}
            >
              <span className="max-w-[260px] truncate text-[13px] font-bold">{g.title}</span>
              <span className={cn("text-[11.5px]", active ? "text-[#cfe0f8]" : "text-ink-soft")}>
                {g.startDate ? formatDate(g.startDate) : "Date TBA"} · {g.count} registration{g.count === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-course toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-border-c bg-surface-alt p-4 print:hidden">
        <div className="me-auto text-sm">
          <p className="font-bold">{courseLabel}</p>
          <p className="text-xs text-ink-soft">
            {activeRows.length} active · {confirmedSeats} confirmed seat{confirmedSeats === 1 ? "" : "s"}
          </p>
        </div>
        <button onClick={() => window.print()} className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800">
          <Printer size={14} aria-hidden="true" /> Print list
        </button>
        <a
          href={emails.length ? mailtoAllHref(adminEmail, emails, mailSubject, mailBody) : undefined}
          aria-disabled={!emails.length}
          onClick={(e) => {
            if (!emails.length) {
              e.preventDefault();
              return;
            }
            if (mailClient === "gmail") {
              e.preventDefault();
              openGmail({ to: adminEmail, bcc: emails, subject: mailSubject, body: mailBody });
            }
          }}
          className={cn(
            "inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
            emails.length ? "border-border-c bg-surface hover:border-blue-400 hover:text-blue-600" : "cursor-not-allowed border-border-c bg-surface text-ink-soft"
          )}
        >
          <Mail size={14} aria-hidden="true" /> Email all ({emails.length})
        </a>
        <div role="radiogroup" aria-label="Email program" className="flex rounded-lg border border-border-c bg-surface p-0.5">
          {(["gmail", "default"] as MailClient[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={mailClient === c}
              onClick={() => {
                setMailClient(c);
                storeMailClient(c);
              }}
              className={cn("min-h-[32px] rounded-md px-3 text-xs font-semibold transition", mailClient === c ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}
            >
              {c === "gmail" ? "Gmail" : "Mail app"}
            </button>
          ))}
        </div>
        <button onClick={() => copyList(emails, "emails")} disabled={!emails.length} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border-c bg-surface px-3 py-2 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
          <Copy size={13} aria-hidden="true" /> Emails
        </button>
        <button onClick={() => copyList(phones, "phones")} disabled={!phones.length} className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border-c bg-surface px-3 py-2 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
          <Copy size={13} aria-hidden="true" /> Phones
        </button>
      </div>

      {/* Printed header: only this course. */}
      <div className="mb-4 hidden print:block">
        <h2 className="text-xl font-bold">{courseLabel}</h2>
        <p className="text-sm">
          Registrations — {courseRows.length} · {confirmedSeats} confirmed seat{confirmedSeats === 1 ? "" : "s"} · printed {new Date().toLocaleDateString()}
        </p>
      </div>

    <div className="overflow-hidden rounded-2xl border border-border-c bg-surface print:rounded-none print:border-0">
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3.5 text-left">#</th>
              <th className="px-6 py-3.5 text-left">Participant</th>
              <th className="px-6 py-3.5 text-left">Email</th>
              <th className="px-6 py-3.5 text-left">Phone</th>
              <th className="px-6 py-3.5 text-left">Seats</th>
              <th className="px-6 py-3.5 text-left">Amount</th>
              <th className="px-6 py-3.5 text-left">Payment Plan</th>
              <th className="px-6 py-3.5 text-left print:hidden">Contact</th>
              <th className="px-6 py-3.5 text-left">Status</th>
              <th className="px-6 py-3.5 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {courseRows.length ? (
              courseRows.map((r, i) => (
                <tr key={r.id} className="border-t border-border-c align-top print:break-inside-avoid">
                  <td className="px-4 py-3.5 text-ink-soft">{i + 1}</td>
                  <td className="px-6 py-3.5 font-semibold">{r.full_name}</td>
                  <td className="px-6 py-3.5">{r.email}</td>
                  <td className="px-6 py-3.5" dir="ltr">{r.phone}</td>
                  <td className="px-6 py-3.5">{r.seats}</td>
                  <td className="px-6 py-3.5 font-bold text-foreground">{formatMoney(r.amount, r.currency)}</td>
                  <td className="px-6 py-3.5">
                    {r.payment_plan === "split_50_50" ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          Split 50/50
                        </span>
                        {r.second_installment && (
                          <span className="text-xs text-ink-soft">
                            2nd: {formatMoney(r.second_installment.amount, r.currency)} —{" "}
                            {r.second_installment.status === "paid" ? (
                              <span className="font-semibold text-green-700 dark:text-green-400">Paid</span>
                            ) : r.second_installment.status === "cancelled" ? (
                              <span className="font-semibold text-gray-500 dark:text-gray-400">Waived</span>
                            ) : (
                              <>
                                due{" "}
                                {r.second_installment.due_date
                                  ? new Date(r.second_installment.due_date).toLocaleDateString()
                                  : "—"}
                              </>
                            )}
                          </span>
                        )}
                        {r.second_installment && r.second_installment.status === "pending" && (
                          <button
                            onClick={() => handleWaiveInstallment(r)}
                            disabled={Boolean(waiving[r.id])}
                            className="inline-flex w-fit items-center gap-1 rounded-full border border-border-c bg-surface px-2.5 py-1 text-xs font-semibold text-foreground transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-60"
                            title="Withdrew — stop charging/chasing the remaining half"
                          >
                            <BellOff size={12} aria-hidden="true" /> {waiving[r.id] ? "Waiving…" : "Waive"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-ink-soft">Full</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 print:hidden">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const waDigits = digitsOnly(r.phone);
                        return (
                          <a
                            href={waDigits ? `https://wa.me/${waDigits}` : undefined}
                            target={waDigits ? "_blank" : undefined}
                            rel={waDigits ? "noopener noreferrer" : undefined}
                            aria-disabled={!waDigits}
                            aria-label={`WhatsApp ${r.full_name}`}
                            onClick={(e) => {
                              if (!waDigits) e.preventDefault();
                            }}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg border transition",
                              waDigits
                                ? "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                                : "cursor-not-allowed border-border-c bg-surface-alt text-ink-soft"
                            )}
                            title={waDigits ? "Open WhatsApp chat" : "Phone missing"}
                          >
                            <MessageCircle size={13} aria-hidden="true" />
                          </a>
                        );
                      })()}
                      <a
                        href={`tel:${r.phone.replace(/\s+/g, "")}`}
                        aria-label={`Call ${r.full_name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                        title="Call this number"
                      >
                        <Phone size={13} aria-hidden="true" />
                      </a>
                      <button
                        onClick={() => handleDelete(r)}
                        disabled={Boolean(deleting[r.id])}
                        aria-label={`Delete registration from ${r.full_name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-red-300 hover:text-red-500 disabled:opacity-60"
                        title="Delete this registration"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col items-start gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                          STATUS_BADGE[r.status] ?? "bg-blue-100 text-blue-600"
                        )}
                      >
                        {statusLabel(r.status)}
                      </span>
                      <select
                        value={r.status}
                        onChange={(e) => changeStatus(r.id, e.target.value as RegistrationStatus)}
                        disabled={Boolean(saving[r.id])}
                        aria-label={`Change status for ${r.full_name}`}
                        className="min-h-[32px] rounded-lg border border-border-c bg-surface px-2 py-1 text-xs font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60 print:hidden"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-ink-soft">No registrations for this course.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}

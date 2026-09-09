"use client";

import * as React from "react";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
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
  /** Null for older rows saved before payments.method existed. */
  payment_method: string | null;
  payment_plan: PaymentPlan;
  /** The deferred second half of a split plan — null unless payment_plan
   *  is 'split_50_50' and a second payments row exists. */
  second_installment: { amount: number; status: string; due_date: string | null } | null;
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

export function RegistrationsTable({ initialRows }: { initialRows: RegistrationRow[] }) {
  const [rows, setRows] = React.useState(initialRows);
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = React.useState<Record<string, boolean>>({});
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

  return (
    <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-6 py-3.5 text-left">Participant</th>
              <th className="px-6 py-3.5 text-left">Email</th>
              <th className="px-6 py-3.5 text-left">Phone</th>
              <th className="px-6 py-3.5 text-left">Course</th>
              <th className="px-6 py-3.5 text-left">Seats</th>
              <th className="px-6 py-3.5 text-left">Amount</th>
              <th className="px-6 py-3.5 text-left">Payment Plan</th>
              <th className="px-6 py-3.5 text-left">Contact</th>
              <th className="px-6 py-3.5 text-left">Status</th>
              <th className="px-6 py-3.5 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border-c align-top">
                  <td className="px-6 py-3.5">{r.full_name}</td>
                  <td className="px-6 py-3.5">{r.email}</td>
                  <td className="px-6 py-3.5">{r.phone}</td>
                  <td className="px-6 py-3.5">{r.course_title}</td>
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
                      </div>
                    ) : (
                      <span className="text-xs text-ink-soft">Full</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
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
                        className="min-h-[32px] rounded-lg border border-border-c bg-surface px-2 py-1 text-xs font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60"
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
                <td colSpan={10} className="px-6 py-8 text-center text-ink-soft">No registrations yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

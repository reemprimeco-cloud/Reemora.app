"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import type { RegistrationStatus } from "@/lib/types";

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
  const { showToast } = useToast();

  async function changeStatus(id: string, next: RegistrationStatus) {
    const prev = rows.find((r) => r.id === id);
    if (!prev || prev.status === next) return;

    // Optimistic — flip immediately, roll back if the update fails.
    setRows((current) => current.map((r) => (r.id === id ? { ...r, status: next } : r)));
    setSaving((s) => ({ ...s, [id]: true }));

    const supabase = createClient();
    const { error } = await supabase.from("registrations").update({ status: next }).eq("id", id);
    setSaving((s) => {
      const { [id]: _omit, ...rest } = s;
      void _omit;
      return rest;
    });

    if (error) {
      setRows((current) => current.map((r) => (r.id === id ? { ...r, status: prev.status } : r)));
      showToast("error", error.message);
      return;
    }
    showToast("success", `Status updated to ${statusLabel(next)}.`);
  }

  return (
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
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border-c align-top">
                  <td className="px-6 py-3.5">{r.full_name}</td>
                  <td className="px-6 py-3.5">{r.email}</td>
                  <td className="px-6 py-3.5">{r.phone}</td>
                  <td className="px-6 py-3.5">{r.course_title}</td>
                  <td className="px-6 py-3.5">{r.seats}</td>
                  <td className="px-6 py-3.5">{formatMoney(r.amount, r.currency)}</td>
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
                <td colSpan={8} className="px-6 py-8 text-center text-ink-soft">No registrations yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

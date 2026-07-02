"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type { CourseWithRelations, CourseSchedule } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function RegisterForm({ course, schedule }: { course: CourseWithRelations; schedule: CourseSchedule }) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [seats, setSeats] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "error" | "info" | "success"; message: string } | null>(
    initialStatus === "success"
      ? { type: "success", message: "Payment received! Your seat is confirmed. We'll email your confirmation shortly." }
      : initialStatus === "failed"
      ? { type: "error", message: "The payment was not completed. You can try again below." }
      : null
  );

  function validate() {
    const next: Record<string, boolean> = {};
    if (fullName.trim().length < 2) next.fullName = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = true;
    if (!/^[0-9+\s()-]{7,20}$/.test(phone.trim())) next.phone = true;
    if (!agreed) next.terms = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);

    if (!validate()) {
      setAlert({ type: "error", message: "Please fix the highlighted fields before continuing." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/myfatoorah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseScheduleId: schedule.id,
          courseSlug: course.slug,
          courseTitle: course.title,
          fullName,
          email,
          phone,
          seats,
          notes,
          unitPrice: course.price,
          currency: course.currency,
        }),
      });

      const data = await res.json();

      if (res.ok && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }

      setAlert({
        type: "info",
        message:
          data.error ||
          "Your registration was saved. Our team will follow up to complete payment.",
      });
    } catch {
      setAlert({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const total = course.price * seats;

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-[22px] border border-border-c bg-surface p-7 sm:p-10">
        {alert && (
          <div
            className={cn(
              "mb-5 rounded-xl border px-4.5 py-3.5 text-sm",
              alert.type === "error" && "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
              alert.type === "info" && "border-blue-200 bg-blue-100 text-blue-600",
              alert.type === "success" && "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            )}
          >
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label className="mb-1.5 block text-[13.5px] font-semibold">Course</label>
            <input
              disabled
              value={`${course.title} — ${formatMoney(course.price, course.currency)}`}
              className="w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm"
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Full Name" error={errors.fullName} errorText="Please enter your full name.">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className={inputClass(errors.fullName)} />
            </Field>
            <Field label="Email Address" error={errors.email} errorText="Please enter a valid email address.">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass(errors.email)} />
            </Field>
            <Field label="Phone Number" error={errors.phone} errorText="Please enter a valid phone number.">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+965 XXXX XXXX" className={inputClass(errors.phone)} />
            </Field>
            <Field label="Number of Seats">
              <input type="number" min={1} max={10} value={seats} onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value || "1", 10)))} className={inputClass(false)} />
            </Field>
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-[13.5px] font-semibold">
              Notes <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know before the course starts?" className="min-h-[100px] w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface" />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              I agree to Reemora&apos;s terms of enrollment and cancellation policy.
            </label>
            {errors.terms && <p className="mt-1 text-xs text-red-500">You must agree to the terms to continue.</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {submitting ? "Connecting to secure payment..." : "Proceed to Secure Payment"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-surface-alt p-6.5">
        <h4 className="mb-4 text-lg font-bold">Order Summary</h4>
        {[
          ["Course", course.title],
          ["Start Date", formatDate(schedule.start_date)],
          ["Price per seat", formatMoney(course.price, course.currency)],
          ["Seats", String(seats)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-border-c py-2.5 text-sm">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        <div className="flex justify-between pt-4 text-[17px] font-bold text-foreground">
          <span>Total Due</span>
          <span>{formatMoney(total, course.currency)}</span>
        </div>
        <div className="mt-4.5 flex flex-wrap gap-2.5">
          {["🔒 Secure Checkout", "MyFatoorah", "KNET · Visa · Mastercard"].map((b) => (
            <span key={b} className="rounded-lg border border-border-c bg-surface px-3 py-2 text-xs font-semibold text-ink-soft">{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function inputClass(error?: boolean) {
  return cn(
    "w-full rounded-lg border bg-surface-alt px-4 py-3 text-[14.5px] outline-none transition focus:bg-surface",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

function Field({
  label,
  error,
  errorText,
  children,
}: {
  label: string;
  error?: boolean;
  errorText?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13.5px] font-semibold">{label}</label>
      {children}
      {error && errorText && <p className="mt-1 text-xs text-red-500">{errorText}</p>}
    </div>
  );
}

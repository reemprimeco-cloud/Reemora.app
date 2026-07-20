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
    if (!Number.isFinite(seats) || seats < 1 || seats > 10) next.seats = true;
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
          fullName,
          email,
          phone,
          seats,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }

      if (data.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
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
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
      <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-10">
        {alert && (
          <div
            role="alert"
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

        <form onSubmit={handleSubmit} noValidate aria-label="Course registration form">
          <div className="mb-5">
            <label htmlFor="reg-course" className="mb-1.5 block text-[13.5px] font-semibold">Course</label>
            <input
              id="reg-course"
              disabled
              value={`${course.title} — ${formatMoney(course.price, course.currency)}`}
              className="w-full rounded-xl border border-border-c bg-surface-alt px-4 py-3.5 text-[15px]"
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field id="reg-full-name" label="Full Name" error={errors.fullName} errorText="Please enter your full name.">
              <input id="reg-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" aria-invalid={errors.fullName || undefined} aria-describedby={errors.fullName ? "reg-full-name-error" : undefined} className={inputClass(errors.fullName)} />
            </Field>
            <Field id="reg-email" label="Email Address" error={errors.email} errorText="Please enter a valid email address.">
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" aria-invalid={errors.email || undefined} aria-describedby={errors.email ? "reg-email-error" : undefined} className={inputClass(errors.email)} />
            </Field>
            <Field id="reg-phone" label="Phone Number" error={errors.phone} errorText="Please enter a valid phone number.">
              <input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+965 XXXX XXXX" autoComplete="tel" aria-invalid={errors.phone || undefined} aria-describedby={errors.phone ? "reg-phone-error" : undefined} className={inputClass(errors.phone)} />
            </Field>
            <Field id="reg-seats" label="Number of Seats" error={errors.seats} errorText="Enter a number between 1 and 10.">
              <input id="reg-seats" type="number" min={1} max={10} value={seats} onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value || "1", 10)))} aria-invalid={errors.seats || undefined} aria-describedby={errors.seats ? "reg-seats-error" : undefined} className={inputClass(errors.seats)} />
            </Field>
          </div>

          <div className="mb-5">
            <label htmlFor="reg-notes" className="mb-1.5 block text-[13.5px] font-semibold">
              Notes <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <textarea id="reg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know before the course starts?" className="min-h-[100px] w-full rounded-xl border border-border-c bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:border-blue-400 focus:bg-surface focus:ring-4 focus:ring-blue-400/15" />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-invalid={errors.terms || undefined} aria-describedby={errors.terms ? "reg-terms-error" : undefined} className="mt-0.5" />
              I agree to Reemora&apos;s terms of enrollment and cancellation policy.
            </label>
            {errors.terms && <p id="reg-terms-error" className="mt-1 text-xs text-red-500">You must agree to the terms to continue.</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60"
          >
            {submitting ? "Connecting to secure payment..." : "Proceed to Secure Payment"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-surface-alt p-6.5">
        <h2 className="mb-4 text-lg font-bold">Order Summary</h2>
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
    "block w-full rounded-xl border bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:bg-surface focus:ring-4 focus:ring-blue-400/15",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

function Field({
  id,
  label,
  error,
  errorText,
  children,
}: {
  id: string;
  label: string;
  error?: boolean;
  errorText?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold">{label}</label>
      {children}
      {error && errorText && <p id={`${id}-error`} className="mt-1 text-xs text-red-500">{errorText}</p>}
    </div>
  );
}

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Tag } from "lucide-react";
import type { CourseWithRelations, CourseSchedule } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { computeOrderTotal, computeSplitPayment, MULTI_SEAT_DISCOUNT_THRESHOLD, type Attendee } from "@/lib/course-utils";
import type { PaymentPlan } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;
const MAX_SEATS = 10;

function emptyAttendee(): Attendee {
  return { full_name: "", email: "", phone: "" };
}

export function RegisterForm({
  course,
  schedule,
  paymentMode,
}: {
  course: CourseWithRelations;
  schedule: CourseSchedule;
  paymentMode: "upayment" | "whatsapp_manual";
}) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const { dict, lang } = useLanguage();
  const t = dict.registerPage;

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [extraAttendees, setExtraAttendees] = React.useState<Attendee[]>([]);
  const [paymentPlan, setPaymentPlan] = React.useState<PaymentPlan>("full");
  const [notes, setNotes] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "error" | "info" | "success"; message: string } | null>(
    initialStatus === "success"
      ? { type: "success", message: t.successAlert }
      : initialStatus === "failed"
      ? { type: "error", message: t.failedAlert }
      : null
  );

  const seats = 1 + extraAttendees.length;
  const maxSeats = Math.min(MAX_SEATS, schedule.seats_available);
  const canAddSeat = seats < maxSeats;
  const { subtotal, discount, total } = computeOrderTotal(course.price, seats);
  const isSplit = paymentMode === "upayment" && paymentPlan === "split_50_50";
  const { dueNow, dueLater } = computeSplitPayment(total);

  function updateAttendee(idx: number, patch: Partial<Attendee>) {
    setExtraAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function addSeat() {
    if (!canAddSeat) return;
    setExtraAttendees((prev) => [...prev, emptyAttendee()]);
  }
  function removeSeat(idx: number) {
    setExtraAttendees((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    const next: Record<string, boolean> = {};
    if (fullName.trim().length < 2) next.fullName = true;
    if (!EMAIL_RE.test(email.trim())) next.email = true;
    if (!PHONE_RE.test(phone.trim())) next.phone = true;
    if (!agreed) next.terms = true;
    extraAttendees.forEach((a, i) => {
      const key = `attendee_${i + 2}`;
      if (a.full_name.trim().length < 2) next[`${key}_name`] = true;
      if (!EMAIL_RE.test(a.email.trim())) next[`${key}_email`] = true;
      if (!PHONE_RE.test(a.phone.trim())) next[`${key}_phone`] = true;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);

    if (!validate()) {
      setAlert({ type: "error", message: t.validationError });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseScheduleId: schedule.id,
          fullName,
          email,
          phone,
          attendees: extraAttendees,
          notes,
          paymentPlan,
        }),
      });

      const data = await res.json();

      if (res.ok && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }

      if (res.ok && data.whatsappManual) {
        const shortRef = typeof data.registrationId === "string" ? data.registrationId.slice(0, 8) : "";
        const params = new URLSearchParams({
          course: course.title,
          total: formatMoney(total, course.currency),
          ...(shortRef ? { ref: shortRef } : {}),
        });
        window.location.href = `/register/thank-you?${params.toString()}`;
        return;
      }

      if (data.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
      }

      setAlert({
        type: "info",
        message: data.error || t.savedNoPayment,
      });
    } catch {
      setAlert({ type: "error", message: t.genericError });
    } finally {
      setSubmitting(false);
    }
  }

  const seatsLeftText =
    schedule.seats_available === 1
      ? t.seatsAvailableOne
      : interpolate(t.seatsAvailableTemplate, { n: schedule.seats_available });

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

        {seats < MULTI_SEAT_DISCOUNT_THRESHOLD && schedule.seats_available >= MULTI_SEAT_DISCOUNT_THRESHOLD && (
          <div
            role="note"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-100 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
          >
            <Tag size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t.discountBanner}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label={t.formLabel}>
          <div className="mb-5">
            <label htmlFor="reg-course" className="mb-1.5 block text-[13.5px] font-semibold">{t.course}</label>
            <input
              id="reg-course"
              disabled
              value={`${course.title} — ${formatMoney(course.price, course.currency)}`}
              className="w-full rounded-xl border border-border-c bg-surface-alt px-4 py-3.5 text-[15px]"
            />
            <p className="mt-1 text-xs text-ink-soft">{seatsLeftText}</p>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold">{t.attendeesHeading}</h3>
              <span className="text-xs text-ink-soft">{t.attendeesHint}</span>
            </div>

            <fieldset className="mb-4 rounded-xl border border-border-c bg-surface-alt p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-600">{t.attendeeYou}</legend>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="reg-full-name" label={t.fullName} error={errors.fullName} errorText={t.fullNameError}>
                  <input id="reg-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.fullNamePlaceholder} autoComplete="name" aria-invalid={errors.fullName || undefined} aria-describedby={errors.fullName ? "reg-full-name-error" : undefined} className={inputClass(errors.fullName)} />
                </Field>
                <Field id="reg-email" label={t.email} error={errors.email} errorText={t.emailError}>
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" aria-invalid={errors.email || undefined} aria-describedby={errors.email ? "reg-email-error" : undefined} className={inputClass(errors.email)} />
                </Field>
                <Field id="reg-phone" label={t.phone} error={errors.phone} errorText={t.phoneError}>
                  <input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} autoComplete="tel" aria-invalid={errors.phone || undefined} aria-describedby={errors.phone ? "reg-phone-error" : undefined} className={inputClass(errors.phone)} />
                </Field>
              </div>
            </fieldset>

            {extraAttendees.map((a, idx) => {
              const seatNo = idx + 2;
              const key = `attendee_${seatNo}`;
              return (
                <fieldset key={idx} className="mb-4 rounded-xl border border-border-c bg-surface-alt p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <legend className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {interpolate(t.attendeeExtra, { n: seatNo })}
                    </legend>
                    <button
                      type="button"
                      onClick={() => removeSeat(idx)}
                      aria-label={`${t.removeSeat} ${seatNo}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border-c bg-surface px-3 py-1 text-xs font-semibold text-foreground transition hover:border-red-300 hover:text-red-500"
                    >
                      <Trash2 size={13} aria-hidden="true" /> {t.removeSeat}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id={`${key}-name`} label={t.fullName} error={errors[`${key}_name`]} errorText={t.fullNameError}>
                      <input
                        id={`${key}-name`}
                        value={a.full_name}
                        onChange={(e) => updateAttendee(idx, { full_name: e.target.value })}
                        placeholder={t.fullNamePlaceholder}
                        autoComplete="off"
                        aria-invalid={errors[`${key}_name`] || undefined}
                        className={inputClass(errors[`${key}_name`])}
                      />
                    </Field>
                    <Field id={`${key}-email`} label={t.email} error={errors[`${key}_email`]} errorText={t.emailError}>
                      <input
                        id={`${key}-email`}
                        type="email"
                        value={a.email}
                        onChange={(e) => updateAttendee(idx, { email: e.target.value })}
                        placeholder={t.emailPlaceholder}
                        autoComplete="off"
                        aria-invalid={errors[`${key}_email`] || undefined}
                        className={inputClass(errors[`${key}_email`])}
                      />
                    </Field>
                    <Field id={`${key}-phone`} label={t.phone} error={errors[`${key}_phone`]} errorText={t.phoneError}>
                      <input
                        id={`${key}-phone`}
                        value={a.phone}
                        onChange={(e) => updateAttendee(idx, { phone: e.target.value })}
                        placeholder={t.phonePlaceholder}
                        autoComplete="off"
                        aria-invalid={errors[`${key}_phone`] || undefined}
                        className={inputClass(errors[`${key}_phone`])}
                      />
                    </Field>
                  </div>
                </fieldset>
              );
            })}

            <button
              type="button"
              onClick={addSeat}
              disabled={!canAddSeat}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-border-c bg-surface-alt px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} aria-hidden="true" /> {t.addSeat}
            </button>
          </div>

          {paymentMode === "upayment" && (
            <div className="mb-5">
              <h3 className="mb-2 text-[15px] font-semibold">{t.paymentPlanHeading}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm transition",
                    paymentPlan === "full" ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-border-c bg-surface-alt"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="payment_plan" checked={paymentPlan === "full"} onChange={() => setPaymentPlan("full")} />
                    {t.paymentPlanFull}
                  </span>
                  <span className="text-xs text-ink-soft">{t.paymentPlanFullHint}</span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-xl border p-4 text-sm transition",
                    paymentPlan === "split_50_50" ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-border-c bg-surface-alt"
                  )}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="payment_plan"
                      checked={paymentPlan === "split_50_50"}
                      onChange={() => setPaymentPlan("split_50_50")}
                    />
                    {t.paymentPlanSplit}
                  </span>
                  <span className="text-xs text-ink-soft">{t.paymentPlanSplitHint}</span>
                </label>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="reg-notes" className="mb-1.5 block text-[13.5px] font-semibold">
              {t.notes} <span className="font-normal text-ink-soft">{t.optional}</span>
            </label>
            <textarea id="reg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} className="min-h-[100px] w-full rounded-xl border border-border-c bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:border-blue-400 focus:bg-surface focus:ring-4 focus:ring-blue-400/15" />
          </div>

          <div className="mb-6">
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-invalid={errors.terms || undefined} aria-describedby={errors.terms ? "reg-terms-error" : undefined} className="mt-0.5" />
              {t.terms}
            </label>
            {errors.terms && <p id="reg-terms-error" className="mt-1 text-xs text-red-500">{t.termsError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>

      <div className="rounded-2xl bg-surface-alt p-6.5 lg:sticky lg:top-[100px]">
        <h2 className="mb-4 text-lg font-bold">{t.orderSummary}</h2>
        {[
          [t.course, course.title],
          [t.startDate, formatDate(schedule.start_date, lang)],
          [t.pricePerSeat, formatMoney(course.price, course.currency)],
          [t.seatsLabel, String(seats)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-border-c py-2.5 text-sm">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        <div className="flex justify-between py-2.5 text-sm">
          <span>{t.subtotal}</span>
          <span>{formatMoney(subtotal, course.currency)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between py-2.5 text-sm text-green-700 dark:text-green-400">
            <span>{t.discountLabel}</span>
            <span>− {formatMoney(discount, course.currency)}</span>
          </div>
        )}
        {isSplit ? (
          <>
            <div className="flex justify-between pt-4 text-[17px] font-bold text-foreground">
              <span>{t.dueNow}</span>
              <span>{formatMoney(dueNow, course.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-border-c py-2.5 text-sm text-ink-soft">
              <span>{t.dueIn30Days}</span>
              <span>{formatMoney(dueLater, course.currency)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between pt-4 text-[17px] font-bold text-foreground">
            <span>{t.totalDue}</span>
            <span>{formatMoney(total, course.currency)}</span>
          </div>
        )}
        <div className="mt-4.5 flex flex-wrap gap-2.5">
          {[t.badgeSecure, t.badgeMf, t.badgeCards].map((b) => (
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

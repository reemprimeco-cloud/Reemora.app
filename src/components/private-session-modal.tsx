"use client";

import * as React from "react";
import { X, CalendarPlus } from "lucide-react";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

interface Props {
  courseId: string;
  courseTitle: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

/** "Customize your date & time" — for a visitor who wants a private 1:1
 *  or in-house group session instead of joining a fixed scheduled cohort.
 *  No payment collected; staff follow up to confirm date/time/pricing. */
export function PrivateSessionModal({ courseId, courseTitle }: Props) {
  const { dict } = useLanguage();
  const t = dict.privateSessionModal;
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [preferredDate, setPreferredDate] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("");
  const [groupSize, setGroupSize] = React.useState("");
  const [certificateNeeded, setCertificateNeeded] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  useCloseOnEscape(() => setOpen(false));

  function validate() {
    const next: Record<string, boolean> = {};
    if (fullName.trim().length < 2) next.fullName = true;
    if (!EMAIL_RE.test(email.trim())) next.email = true;
    if (!PHONE_RE.test(phone.trim())) next.phone = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) {
      setBanner({ type: "error", text: t.validationError });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/private-session-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          preferredDate: preferredDate || null,
          preferredTime,
          groupSize: groupSize ? Number(groupSize) : null,
          certificateNeeded,
          notes,
          courseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
        }
        setBanner({ type: "error", text: data.error || t.genericError });
        return;
      }
      setBanner({ type: "success", text: t.successMessage });
      setFullName("");
      setEmail("");
      setPhone("");
      setPreferredDate("");
      setPreferredTime("");
      setGroupSize("");
      setCertificateNeeded(false);
      setNotes("");
    } catch {
      setBanner({ type: "error", text: t.networkError });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setBanner(null);
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-border-c bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600"
      >
        <CalendarPlus size={15} /> {t.ctaLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1500] flex items-end justify-center bg-navy-900/55 sm:items-center sm:p-5"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="private-session-modal-title"
            className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[22px] bg-surface p-5 shadow-2xl sm:rounded-[22px] sm:p-7"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="private-session-modal-title" className="text-lg font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {t.description} <strong>{courseTitle}</strong> {t.descriptionAfter}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-c"
              >
                <X size={16} />
              </button>
            </div>

            {banner && (
              <div
                role="alert"
                className={cn(
                  "mb-4 rounded-lg border px-4 py-3 text-sm",
                  banner.type === "error"
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                )}
              >
                {banner.text}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ps-name" className="mb-1.5 block text-[13.5px] font-semibold">{t.fullName}</label>
                  <input
                    id="ps-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    aria-invalid={errors.fullName || undefined}
                    className={inputClass(errors.fullName)}
                    placeholder={t.fullNamePlaceholder}
                  />
                </div>
                <div>
                  <label htmlFor="ps-email" className="mb-1.5 block text-[13.5px] font-semibold">{t.email}</label>
                  <input
                    id="ps-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-invalid={errors.email || undefined}
                    className={inputClass(errors.email)}
                    placeholder={t.emailPlaceholder}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ps-phone" className="mb-1.5 block text-[13.5px] font-semibold">{t.phone}</label>
                <input
                  id="ps-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  aria-invalid={errors.phone || undefined}
                  className={inputClass(errors.phone)}
                  placeholder={t.phonePlaceholder}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ps-date" className="mb-1.5 block text-[13.5px] font-semibold">
                    {t.preferredDate} <span className="font-normal text-ink-soft">{t.optional}</span>
                  </label>
                  <input
                    id="ps-date"
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className={inputClass(false)}
                  />
                </div>
                <div>
                  <label htmlFor="ps-time" className="mb-1.5 block text-[13.5px] font-semibold">
                    {t.preferredTime} <span className="font-normal text-ink-soft">{t.optional}</span>
                  </label>
                  <input
                    id="ps-time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    placeholder={t.preferredTimePlaceholder}
                    className={inputClass(false)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ps-group-size" className="mb-1.5 block text-[13.5px] font-semibold">
                  {t.groupSize} <span className="font-normal text-ink-soft">{t.optional}</span>
                </label>
                <input
                  id="ps-group-size"
                  type="number"
                  min={1}
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className={inputClass(false)}
                />
              </div>
              <label className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                <input
                  type="checkbox"
                  checked={certificateNeeded}
                  onChange={(e) => setCertificateNeeded(e.target.checked)}
                />
                {t.certificateNeeded}
              </label>
              <div>
                <label htmlFor="ps-notes" className="mb-1.5 block text-[13.5px] font-semibold">
                  {t.notes} <span className="font-normal text-ink-soft">{t.optional}</span>
                </label>
                <textarea
                  id="ps-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass(false)} min-h-[90px]`}
                  placeholder={t.notesPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60"
              >
                {submitting ? t.submitting : t.submit}
              </button>
              <p className="text-center text-[12px] text-ink-soft">{t.disclaimer}</p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function inputClass(error?: boolean) {
  return cn(
    "block w-full rounded-xl border bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:bg-surface focus:ring-4 focus:ring-blue-400/15",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

"use client";

import * as React from "react";
import { X, HelpCircle } from "lucide-react";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  courseScheduleId?: string | null;
  courseTitle: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

/** Non-committal "learn more" form for the course detail page. Captures a
 *  soft lead into course_inquiries without going through the paid
 *  registration + MyFatoorah flow — same person can still register + pay
 *  afterwards via the main Register CTA. */
export function InquiryModal({ courseId, courseScheduleId, courseTitle }: Props) {
  const [open, setOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
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
      setBanner({ type: "error", text: "Please fix the highlighted fields before continuing." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          message,
          courseId,
          courseScheduleId: courseScheduleId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
        }
        setBanner({ type: "error", text: data.error || "Something went wrong. Please try again." });
        return;
      }
      setBanner({ type: "success", text: "Thanks! We'll be in touch shortly with more details." });
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setBanner({ type: "error", text: "Network error. Please try again." });
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
        <HelpCircle size={15} /> Ask a Question / Reserve Interest
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-navy-900/55 p-5"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-modal-title"
            className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-[22px] bg-surface p-7 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 id="inquiry-modal-title" className="text-lg font-bold">Learn more about this course</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Leave your details for <strong>{courseTitle}</strong> — we&apos;ll follow up with more information. No payment required. You can register and pay whenever you&apos;re ready.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
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
              <div>
                <label htmlFor="inq-name" className="mb-1.5 block text-[13.5px] font-semibold">Full Name</label>
                <input
                  id="inq-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={errors.fullName || undefined}
                  className={inputClass(errors.fullName)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="inq-email" className="mb-1.5 block text-[13.5px] font-semibold">Email</label>
                <input
                  id="inq-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-invalid={errors.email || undefined}
                  className={inputClass(errors.email)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="inq-phone" className="mb-1.5 block text-[13.5px] font-semibold">Phone</label>
                <input
                  id="inq-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  aria-invalid={errors.phone || undefined}
                  className={inputClass(errors.phone)}
                  placeholder="+965 XXXX XXXX"
                />
              </div>
              <div>
                <label htmlFor="inq-msg" className="mb-1.5 block text-[13.5px] font-semibold">
                  Message <span className="font-normal text-ink-soft">(optional)</span>
                </label>
                <textarea
                  id="inq-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${inputClass(false)} min-h-[90px]`}
                  placeholder="Any questions about the course, dates, or format?"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send Inquiry"}
              </button>
              <p className="text-center text-[12px] text-ink-soft">
                No payment collected. We&apos;ll follow up by email or phone.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function inputClass(error?: boolean) {
  return cn(
    "w-full rounded-lg border bg-surface-alt px-4 py-3 text-sm outline-none transition focus:bg-surface",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

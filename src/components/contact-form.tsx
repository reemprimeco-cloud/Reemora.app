"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm() {
  const { dict } = useLanguage();
  const t = dict.contactPage;

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<{ type: "error" | "success"; message: string } | null>(null);

  function validate() {
    const next: Record<string, boolean> = {};
    if (name.trim().length < 2) next.name = true;
    if (!EMAIL_RE.test(email.trim())) next.email = true;
    if (message.trim().length < 5) next.message = true;
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
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
        }
        setAlert({ type: "error", message: data.error || t.genericError });
        return;
      }
      setAlert({ type: "success", message: t.successMessage });
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
      setErrors({});
    } catch {
      setAlert({ type: "error", message: t.genericError });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-10">
      {alert && (
        <div
          role="alert"
          className={cn(
            "mb-5 rounded-xl border px-4.5 py-3.5 text-sm",
            alert.type === "error"
              ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
          )}
        >
          {alert.message}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate aria-label={t.formLabel} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-[13.5px] font-semibold">{t.fullName}</label>
          <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass(errors.name)} placeholder={t.fullNamePlaceholder} autoComplete="name" aria-invalid={errors.name || undefined} aria-describedby={errors.name ? "contact-name-error" : undefined} />
          {errors.name && <p id="contact-name-error" className="mt-1 text-xs text-red-500">{t.fullNameError}</p>}
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-[13.5px] font-semibold">{t.email}</label>
          <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(errors.email)} placeholder={t.emailPlaceholder} autoComplete="email" aria-invalid={errors.email || undefined} aria-describedby={errors.email ? "contact-email-error" : undefined} />
          {errors.email && <p id="contact-email-error" className="mt-1 text-xs text-red-500">{t.emailError}</p>}
        </div>
        <div>
          <label htmlFor="contact-phone" className="mb-1.5 block text-[13.5px] font-semibold">{t.phone} <span className="font-normal text-ink-soft">{t.optional}</span></label>
          <input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass(false)} placeholder={t.phonePlaceholder} autoComplete="tel" />
        </div>
        <div>
          <label htmlFor="contact-subject" className="mb-1.5 block text-[13.5px] font-semibold">{t.subject} <span className="font-normal text-ink-soft">{t.optional}</span></label>
          <input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass(false)} placeholder={t.subjectPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="mb-1.5 block text-[13.5px] font-semibold">{t.message}</label>
          <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} className={cn(inputClass(errors.message), "min-h-[140px]")} placeholder={t.messagePlaceholder} aria-invalid={errors.message || undefined} aria-describedby={errors.message ? "contact-message-error" : undefined} />
          {errors.message && <p id="contact-message-error" className="mt-1 text-xs text-red-500">{t.messageError}</p>}
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

function inputClass(error?: boolean) {
  return cn(
    "block w-full rounded-xl border bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:bg-surface focus:ring-4 focus:ring-blue-400/15",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

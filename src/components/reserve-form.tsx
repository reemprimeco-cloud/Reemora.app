"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

interface CourseOption {
  id: string;
  title: string;
}

export function ReserveForm({ courses }: { courses: CourseOption[] }) {
  const { dict } = useLanguage();
  const t = dict.reservePage;
  const params = useSearchParams();
  const preselectedCourseId = params.get("course") ?? "";

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [courseId, setCourseId] = React.useState(preselectedCourseId);
  const [interest, setInterest] = React.useState("");
  const [skills, setSkills] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "error"; text: string } | null>(null);
  const [done, setDone] = React.useState(false);

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
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, courseId: courseId || null, interest, skills }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
        }
        setBanner({ type: "error", text: data.error || t.genericError });
        return;
      }
      setDone(true);
    } catch {
      setBanner({ type: "error", text: t.networkError });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[22px] border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950 sm:p-10">
        <CheckCircle2 className="mx-auto mb-3 text-green-600 dark:text-green-400" size={40} aria-hidden="true" />
        <h2 className="mb-2 text-xl font-bold text-green-700 dark:text-green-300">{t.successTitle}</h2>
        <p className="mb-6 text-sm text-green-700 dark:text-green-300">{t.successBody}</p>
        <Link
          href="/courses"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800"
        >
          {t.successBrowse}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-10">
      {banner && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4.5 py-3.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {banner.text}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate aria-label={t.formLabel} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="res-name" className="mb-1.5 block text-[13.5px] font-semibold">{t.fullName}</label>
          <input
            id="res-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            aria-invalid={errors.fullName || undefined}
            aria-describedby={errors.fullName ? "res-name-error" : undefined}
            className={inputClass(errors.fullName)}
            placeholder={t.fullNamePlaceholder}
          />
          {errors.fullName && <p id="res-name-error" className="mt-1 text-xs text-red-500">{t.fullNameError}</p>}
        </div>
        <div>
          <label htmlFor="res-phone" className="mb-1.5 block text-[13.5px] font-semibold">{t.phone}</label>
          <input
            id="res-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            aria-invalid={errors.phone || undefined}
            aria-describedby={errors.phone ? "res-phone-error" : undefined}
            className={inputClass(errors.phone)}
            placeholder={t.phonePlaceholder}
          />
          {errors.phone && <p id="res-phone-error" className="mt-1 text-xs text-red-500">{t.phoneError}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="res-email" className="mb-1.5 block text-[13.5px] font-semibold">{t.email}</label>
          <input
            id="res-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={errors.email || undefined}
            aria-describedby={errors.email ? "res-email-error" : undefined}
            className={inputClass(errors.email)}
            placeholder={t.emailPlaceholder}
          />
          {errors.email && <p id="res-email-error" className="mt-1 text-xs text-red-500">{t.emailError}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="res-course" className="mb-1.5 block text-[13.5px] font-semibold">
            {t.course} <span className="font-normal text-ink-soft">{t.optional}</span>
          </label>
          <select
            id="res-course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={inputClass(false)}
          >
            <option value="">{t.noneOption}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="res-interest" className="mb-1.5 block text-[13.5px] font-semibold">
            {t.interest} <span className="font-normal text-ink-soft">{t.optional}</span>
          </label>
          <textarea
            id="res-interest"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className={cn(inputClass(false), "min-h-[90px]")}
            placeholder={t.interestPlaceholder}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="res-skills" className="mb-1.5 block text-[13.5px] font-semibold">
            {t.skills} <span className="font-normal text-ink-soft">{t.optional}</span>
          </label>
          <textarea
            id="res-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className={cn(inputClass(false), "min-h-[110px]")}
            placeholder={t.skillsPlaceholder}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60"
          >
            {submitting ? t.submitting : t.submit}
          </button>
          <p className="mt-3 text-center text-[12px] text-ink-soft">{t.disclaimer}</p>
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

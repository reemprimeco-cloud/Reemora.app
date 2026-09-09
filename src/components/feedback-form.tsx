"use client";

import * as React from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

interface CourseOption {
  id: string;
  title: string;
}

export function FeedbackForm({ courses }: { courses: CourseOption[] }) {
  const { dict } = useLanguage();
  const t = dict.feedbackPage;

  const [courseId, setCourseId] = React.useState("");
  const [studentName, setStudentName] = React.useState("");
  const [roleCompany, setRoleCompany] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [quote, setQuote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [alert, setAlert] = React.useState<string | null>(null);

  function validate() {
    const next: Record<string, boolean> = {};
    if (!courseId) next.courseId = true;
    if (studentName.trim().length < 2) next.studentName = true;
    if (quote.trim().length < 5) next.quote = true;
    if (rating < 1 || rating > 5) next.rating = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlert(null);
    if (!validate()) {
      setAlert(t.validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, studentName, roleCompany, rating, quote }),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        return;
      }

      if (data.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
      }
      setAlert(data.error || t.genericError);
    } catch {
      setAlert(t.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[22px] border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 size={32} className="mx-auto mb-3 text-green-600 dark:text-green-400" aria-hidden="true" />
        <h2 className="mb-1.5 text-lg font-bold text-green-800 dark:text-green-300">{t.successTitle}</h2>
        <p className="text-sm text-green-700 dark:text-green-400">{t.successBody}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
      {alert && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4.5 py-3.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {alert}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-5">
          <label htmlFor="fb-course" className="mb-1.5 block text-[13.5px] font-semibold">{t.courseLabel}</label>
          <select
            id="fb-course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            aria-invalid={errors.courseId || undefined}
            className={inputClass(errors.courseId)}
          >
            <option value="">{t.coursePlaceholder}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {errors.courseId && <p className="mt-1 text-xs text-red-500">{t.courseError}</p>}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fb-name" className="mb-1.5 block text-[13.5px] font-semibold">{t.nameLabel}</label>
            <input
              id="fb-name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder={t.namePlaceholder}
              aria-invalid={errors.studentName || undefined}
              className={inputClass(errors.studentName)}
            />
            {errors.studentName && <p className="mt-1 text-xs text-red-500">{t.nameError}</p>}
          </div>
          <div>
            <label htmlFor="fb-role" className="mb-1.5 block text-[13.5px] font-semibold">
              {t.roleLabel} <span className="font-normal text-ink-soft">{t.roleOptional}</span>
            </label>
            <input
              id="fb-role"
              value={roleCompany}
              onChange={(e) => setRoleCompany(e.target.value)}
              placeholder={t.rolePlaceholder}
              className={inputClass(false)}
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-[13.5px] font-semibold">{t.ratingLabel}</label>
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t.ratingLabel}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} / 5`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5"
              >
                <Star
                  size={30}
                  className={cn(
                    "transition-colors",
                    (hoverRating || rating) >= n ? "fill-amber-400 text-amber-400" : "fill-transparent text-border-c"
                  )}
                />
              </button>
            ))}
          </div>
          {errors.rating && <p className="mt-1 text-xs text-red-500">{t.ratingError}</p>}
        </div>

        <div className="mb-6">
          <label htmlFor="fb-quote" className="mb-1.5 block text-[13.5px] font-semibold">{t.quoteLabel}</label>
          <textarea
            id="fb-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder={t.quotePlaceholder}
            aria-invalid={errors.quote || undefined}
            className={cn(inputClass(errors.quote), "min-h-[110px]")}
          />
          {errors.quote && <p className="mt-1 text-xs text-red-500">{t.quoteError}</p>}
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
  );
}

function inputClass(error?: boolean): string {
  return cn(
    "block w-full rounded-xl border bg-surface-alt px-4 py-3.5 text-[15px] outline-none transition focus:bg-surface focus:ring-4 focus:ring-blue-400/15",
    error ? "border-red-400" : "border-border-c focus:border-blue-400"
  );
}

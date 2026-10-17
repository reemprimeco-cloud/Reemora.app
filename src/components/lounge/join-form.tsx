"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";
import { PasswordInput } from "@/components/password-input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

export function JoinForm({ signedInEmail }: { signedInEmail: string | null }) {
  const { dict } = useLanguage();
  const t = dict.lounge.join;

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState(signedInEmail ?? "");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [banner, setBanner] = React.useState<{ type: "error" | "info"; text: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ needsEmailConfirmation: boolean } | null>(null);

  function validate() {
    const next: Record<string, boolean> = {};
    if (fullName.trim().length < 2) next.fullName = true;
    if (!EMAIL_RE.test(email.trim())) next.email = true;
    if (!PHONE_RE.test(phone.trim())) next.phone = true;
    if (!signedInEmail && password.length < 8) next.password = true;
    if (!agreed) next.agreed = true;
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
      const res = await fetch("/api/lounge/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A signed-in applicant has no password to set; send a filler the
        // route ignores for that case so the schema still passes.
        body: JSON.stringify({ fullName, email, phone, password: signedInEmail ? "signed-in-user" : password, agreed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(data.fieldErrors).map((k) => [k, true])) }));
        setBanner({ type: "error", text: res.status === 409 ? t.existsError : data.error || t.genericError });
        return;
      }
      setDone({ needsEmailConfirmation: Boolean(data.needsEmailConfirmation) });
    } catch {
      setBanner({ type: "error", text: t.genericError });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[22px] border border-green-200 bg-green-50 p-7 text-center dark:border-green-900 dark:bg-green-950 sm:p-10">
        <CheckCircle2 className="mx-auto mb-4 text-green-600 dark:text-green-400" size={44} aria-hidden="true" />
        <h2 className="mb-3 text-2xl font-bold text-green-700 dark:text-green-300">{t.successTitle}</h2>
        <p className="mb-6 text-[15px] text-green-700 dark:text-green-300">{done.needsEmailConfirmation ? t.successBodyConfirm : t.successBodyNoConfirm}</p>
        <Link href={signedInEmail ? "/lounge" : "/lounge/login"} className="inline-flex rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">
          {signedInEmail ? dict.lounge.nav.feed : t.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
      {banner && <Banner type={banner.type}>{banner.text}</Banner>}
      {signedInEmail && <Banner type="info">{interpolate(t.alreadySignedIn, { email: signedInEmail })}</Banner>}

      <div className="grid grid-cols-1 gap-4">
        <Field id="join-name" label={t.fullName} error={errors.fullName ? t.fullNameError : null}>
          <input id="join-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.fullNamePlaceholder} autoComplete="name" aria-invalid={errors.fullName || undefined} className={inputClass(errors.fullName)} />
        </Field>
        <Field id="join-email" label={t.email} error={errors.email ? t.emailError : null}>
          <input id="join-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} autoComplete="email" disabled={Boolean(signedInEmail)} aria-invalid={errors.email || undefined} className={inputClass(errors.email, "disabled:opacity-60")} />
        </Field>
        <Field id="join-phone" label={t.phone} error={errors.phone ? t.phoneError : null}>
          <input id="join-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.phonePlaceholder} autoComplete="tel" dir="ltr" aria-invalid={errors.phone || undefined} className={inputClass(errors.phone)} />
        </Field>
        {!signedInEmail && (
          <Field id="join-password" label={t.password} error={errors.password ? t.passwordError : null}>
            <PasswordInput id="join-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} autoComplete="new-password" minLength={8} aria-invalid={errors.password || undefined} className={inputClass(errors.password)} showLabel={t.showPassword} hideLabel={t.hidePassword} />
          </Field>
        )}
        <div>
          <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} aria-invalid={errors.agreed || undefined} className="mt-0.5" />
            {t.terms}
          </label>
          {errors.agreed && <p className="mt-1 text-xs text-red-500">{t.termsError}</p>}
        </div>
        <button type="submit" disabled={submitting} className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60">
          {submitting ? t.submitting : t.submit}
        </button>
        {!signedInEmail && (
          <p className="text-center text-sm text-ink-soft">
            {t.haveAccount}{" "}
            <Link href="/lounge/login" className="font-semibold text-blue-600 hover:underline">
              {t.signIn}
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}

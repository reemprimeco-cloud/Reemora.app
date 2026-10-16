"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/lounge";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { dict } = useLanguage();
  const t = dict.lounge.login;

  const [mode, setMode] = React.useState<"login" | "reset">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "error" | "success" | "info"; text: string } | null>(
    params.get("confirmed") ? { type: "success", text: t.confirmedBanner } : null
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      const notConfirmed = error.message.toLowerCase().includes("confirm");
      setBanner({ type: "error", text: notConfirmed ? t.unconfirmed : t.invalid });
      return;
    }
    router.push(safeNext(params.get("next")));
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/lounge/reset`,
    });
    setBusy(false);
    // Always the same message — never reveal whether the email exists.
    setBanner({ type: "info", text: t.resetSent });
  }

  const isReset = mode === "reset";

  return (
    <form onSubmit={isReset ? handleReset : handleLogin} className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
      {banner && <Banner type={banner.type}>{banner.text}</Banner>}
      <div className="grid grid-cols-1 gap-4">
        <Field id="login-email" label={t.email}>
          <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass()} />
        </Field>
        {!isReset && (
          <Field id="login-password" label={t.password}>
            <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass()} />
          </Field>
        )}
        <button type="submit" disabled={busy} className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800 disabled:opacity-60">
          {busy ? t.submitting : isReset ? t.resetSubmit : t.submit}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
          <button type="button" onClick={() => setMode(isReset ? "login" : "reset")} className="font-semibold text-blue-600 hover:underline">
            {isReset ? t.submit : t.forgot}
          </button>
          <span>
            {t.noAccount}{" "}
            <Link href="/lounge/join" className="font-semibold text-blue-600 hover:underline">
              {t.apply}
            </Link>
          </span>
        </div>
      </div>
    </form>
  );
}

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/lounge";
}

/** Tap-to-continue landing for one-time sign-in links (Lounge invites,
 *  "Copy sign-in link"). The token is verified only when the person taps
 *  the button, never on page load: WhatsApp's link preview and email
 *  security scanners open links as soon as they are sent, and a link that
 *  signed in on open was already spent when the member tapped it. */
function Confirm() {
  const router = useRouter();
  const params = useSearchParams();
  const { dict } = useLanguage();
  const t = dict.lounge.login;
  const [state, setState] = React.useState<"idle" | "busy" | "failed">("idle");

  const tokenHash = params.get("token_hash");
  const rawType = params.get("type");
  const type = OTP_TYPES.find((v) => v === rawType) ?? null;
  const next = safeNext(params.get("next"));
  const usable = Boolean(tokenHash && type);

  async function onContinue() {
    if (!tokenHash || !type) return;
    setState("busy");
    try {
      const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        setState("failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setState("failed");
    }
  }

  const failed = state === "failed" || !usable;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt p-6 text-center">
      <div className="w-full max-w-[420px] rounded-[22px] border border-border-c bg-surface p-10">
        {failed ? (
          <>
            <p className="mb-5 text-sm text-red-600">{t.finishFailed}</p>
            <a href="/lounge/login" className="inline-flex rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white">
              {t.submit}
            </a>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-bold text-foreground">{t.confirmTitle}</h1>
            <p className="mb-6 text-sm text-ink-soft">{t.confirmBody}</p>
            <button
              type="button"
              onClick={onContinue}
              disabled={state === "busy"}
              aria-busy={state === "busy"}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
            >
              {state === "busy" ? t.finishing : t.confirmButton}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <Confirm />
    </Suspense>
  );
}

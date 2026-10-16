"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/lounge";
}

/** Second stop for Supabase's default email links. Those links send the
 *  session back in the URL fragment (#access_token=…), which a server
 *  route can never see, so /auth/callback forwards here and this page
 *  stores the session with the browser client, then continues. */
function Finish() {
  const router = useRouter();
  const params = useSearchParams();
  const { dict } = useLanguage();
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    const next = safeNext(params.get("next"));
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      if (hash.get("error")) setFailed(true);
      else router.replace(`/lounge/login?confirmed=1${next !== "/lounge" ? `&next=${encodeURIComponent(next)}` : ""}`);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setFailed(true);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        router.replace(next);
        router.refresh();
      })
      .catch(() => setFailed(true));
  }, [params, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt p-6 text-center">
      <div className="w-full max-w-[420px] rounded-[22px] border border-border-c bg-surface p-10">
        {failed ? (
          <>
            <p className="mb-5 text-sm text-red-600">{dict.lounge.login.finishFailed}</p>
            <a href="/lounge/login" className="inline-flex rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white">
              {dict.lounge.login.submit}
            </a>
          </>
        ) : (
          <>
            <div role="status" aria-label={dict.lounge.login.finishing} className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
            <p className="text-sm text-ink-soft">{dict.lounge.login.finishing}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthFinishPage() {
  return (
    <Suspense fallback={null}>
      <Finish />
    </Suspense>
  );
}

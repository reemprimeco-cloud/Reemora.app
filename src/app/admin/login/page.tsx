"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

function safeNext(value: string | null): string {
  return value && value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400";

type Notice = { type: "error" | "success" | "info"; text: string };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<"login" | "forgot">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice | null>(() => {
    const reset = searchParams.get("reset");
    if (reset === "expired") return { type: "error", text: "That reset link has expired or was already used. Request a new one below." };
    if (reset === "done") return { type: "success", text: "Password updated. Sign in with your new password." };
    return null;
  });
  const isForgot = mode === "forgot";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setNotice({ type: "error", text: "Incorrect email or password. Please try again." });
      return;
    }
    router.push(safeNext(searchParams.get("next")));
    router.refresh();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/reset`,
    });
    setLoading(false);
    if (error && /rate|too many|seconds/i.test(error.message)) {
      setNotice({ type: "error", text: "Too many reset emails in a short time. Wait a minute, then try again." });
      return;
    }
    // Same message whether or not the address has an account.
    setNotice({ type: "info", text: "If that email belongs to an admin account, a reset link is on its way. Open it on this device to choose a new password." });
  }

  function switchMode(next: "login" | "forgot") {
    setMode(next);
    setNotice(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-5">
      <div className="w-full max-w-[400px] rounded-[22px] bg-surface p-8 text-center shadow-2xl sm:p-11">
        <Image src="/images/logo.png" alt="Reemora logo" width={130} height={34} className="mx-auto mb-6 h-8 w-auto dark:brightness-0 dark:invert" />
        <h1 className="mb-2 text-2xl font-bold">{isForgot ? "Reset password" : "Admin Login"}</h1>
        <p className="mb-6.5 text-sm text-ink-soft">
          {isForgot ? "Enter your admin email and we'll send you a link to choose a new password." : "Sign in to manage courses, scheduling and registrations."}
        </p>

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={
              notice.type === "error"
                ? "mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                : notice.type === "success"
                  ? "mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                  : "mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
            }
          >
            {notice.text}
          </div>
        )}

        <form onSubmit={isForgot ? handleForgot : handleLogin} className="text-left">
          <div className="mb-4">
            <label htmlFor="login-email" className="mb-1.5 block text-[13.5px] font-semibold">Email</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@reemora.app"
            />
          </div>
          {!isForgot && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-[13.5px] font-semibold">Password</label>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="-my-2 min-h-[40px] px-1 text-[13px] font-semibold text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <PasswordInput
                id="login-password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Enter admin password"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {isForgot ? (loading ? "Sending..." : "Send reset link") : loading ? "Signing in..." : "Sign In"}
          </button>
          {isForgot && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="mt-3 min-h-[44px] w-full rounded-full text-sm font-semibold text-ink-soft transition hover:text-blue-600"
            >
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

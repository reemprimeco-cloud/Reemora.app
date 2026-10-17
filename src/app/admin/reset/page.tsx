"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";

/** Second half of the admin "Forgot password?" flow. The email link goes
 *  through /auth/callback, which signs the admin in with a short-lived
 *  recovery session and lands here; middleware already sends anyone
 *  without a session back to /admin/login. */
const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      // An expired recovery session shows up here as an auth error.
      if (/session|jwt|expired|not authenticated/i.test(updateError.message)) {
        router.replace("/admin/login?reset=expired");
        return;
      }
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/admin");
      router.refresh();
    }, 900);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-5">
      <div className="w-full max-w-[400px] rounded-[22px] bg-surface p-8 text-center shadow-2xl sm:p-11">
        <Image src="/images/logo.png" alt="Reemora logo" width={130} height={34} className="mx-auto mb-6 h-8 w-auto dark:brightness-0 dark:invert" />
        <h1 className="mb-2 text-2xl font-bold">Choose a new password</h1>
        <p className="mb-6.5 text-sm text-ink-soft">You&apos;ll stay signed in and go straight to the dashboard.</p>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {done && (
          <div role="status" className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-left text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            Password updated. Opening the dashboard…
          </div>
        )}

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4">
            <label htmlFor="reset-password" className="mb-1.5 block text-[13.5px] font-semibold">New password</label>
            <PasswordInput
              id="reset-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="reset-confirm" className="mb-1.5 block text-[13.5px] font-semibold">Confirm new password</label>
            <PasswordInput
              id="reset-confirm"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading || done}
            className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

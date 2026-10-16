"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";

/** Second half of "forgot password": the recovery link lands here with a
 *  session, and the member picks a new password. */
export function ResetPasswordForm() {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.lounge.login;
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setBanner({ type: "error", text: dict.lounge.join.passwordError });
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setBanner({ type: "error", text: error.message });
      return;
    }
    setBanner({ type: "success", text: t.newPasswordDone });
    setTimeout(() => {
      router.push("/lounge");
      router.refresh();
    }, 800);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
      {banner && <Banner type={banner.type}>{banner.text}</Banner>}
      <div className="grid gap-4">
        <Field id="new-password" label={t.password}>
          <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass()} />
        </Field>
        <button type="submit" disabled={busy} className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {t.newPasswordSubmit}
        </button>
      </div>
    </form>
  );
}

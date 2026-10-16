"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useLanguage } from "@/lib/i18n/context";

/** Shown on /lounge to a signed-in site admin who has no Lounge profile yet. */
export function AdminProfileSetup() {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.lounge.adminSetup;
  const { showToast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function create() {
    setBusy(true);
    try {
      const res = await fetch("/api/lounge/admin-profile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || dict.lounge.common.error);
      showToast("success", t.done);
      router.push("/lounge/me");
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[560px] rounded-[22px] border border-blue-400 bg-surface p-7 text-center sm:p-10">
      <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <BadgeCheck size={28} aria-hidden="true" />
      </span>
      <h1 className="mb-3 text-[26px] font-bold sm:text-3xl">{t.title}</h1>
      <p className="mb-6 text-[15px] text-ink-soft">{t.body}</p>
      <button type="button" onClick={create} disabled={busy} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
        <BadgeCheck size={17} aria-hidden="true" /> {busy ? t.creating : t.button}
      </button>
    </div>
  );
}

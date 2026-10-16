"use client";

import * as React from "react";
import { Flag, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";
import { inputClass } from "@/components/lounge/form-field";
import { cn } from "@/lib/utils";
import type { LoungeReportTarget } from "@/lib/supabase/lounge.types";

export function ReportButton({ targetType, targetId, compact }: { targetType: LoungeReportTarget; targetId: string; compact?: boolean }) {
  const { dict } = useLanguage();
  const t = dict.lounge.feed;
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const close = React.useCallback(() => setOpen(false), []);
  useCloseOnEscape(close);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lounge/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        showToast("error", t.reportDuplicate);
      } else if (!res.ok) {
        throw new Error(data.error);
      } else {
        showToast("success", t.reportSent);
      }
      setOpen(false);
      setReason("");
    } catch (err) {
      showToast("error", err instanceof Error && err.message ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-ink-soft transition hover:text-red-500",
          compact ? "text-xs" : "rounded-full border border-border-c bg-surface px-4 py-2.5 text-sm font-semibold hover:border-red-300"
        )}
        aria-label={targetType === "member" ? dict.lounge.profile.report : t.report}
      >
        <Flag size={compact ? 13 : 15} aria-hidden="true" /> {compact ? null : targetType === "member" ? dict.lounge.profile.report : t.report}
      </button>

      {open && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-navy-900/55 p-5" onClick={(e) => e.target === e.currentTarget && close()}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-[420px] rounded-[22px] bg-surface p-6 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="report-title" className="text-lg font-bold">
                {t.report}
              </h2>
              <button type="button" onClick={close} aria-label={dict.lounge.common.close} className="rounded-full p-1.5 text-ink-soft hover:bg-surface-alt">
                <X size={16} />
              </button>
            </div>
            <label htmlFor="report-reason" className="mb-1.5 block text-[13.5px] font-semibold">
              {t.reportReason}
            </label>
            <textarea id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required minLength={3} className={inputClass(false, "min-h-[100px]")} />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={close} className="rounded-full border-2 border-border-c px-5 py-2.5 text-sm font-semibold">
                {dict.lounge.common.cancel}
              </button>
              <button type="submit" disabled={busy || reason.trim().length < 3} className="rounded-full border-2 border-transparent bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                {t.reportSubmit}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

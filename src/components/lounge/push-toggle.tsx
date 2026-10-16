"use client";

import * as React from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { urlBase64ToUint8Array, isIosDevice, isStandalone, pushSupported, registerServiceWorker } from "@/lib/push-client";

type Status = "unsupported" | "checking" | "off" | "on" | "denied";

/** Member-facing Web Push toggle. Permission is only ever requested from
 *  the button's click handler — never on page load — and the UI reflects
 *  the browser's actual permission/subscription state, not a wish. */
export function PushToggle() {
  const { dict } = useLanguage();
  const t = dict.lounge.settings;
  const { showToast } = useToast();
  const [status, setStatus] = React.useState<Status>("checking");
  const [busy, setBusy] = React.useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const refresh = React.useCallback(async () => {
    if (!pushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function enable() {
    if (!vapidKey) {
      showToast("error", t.pushNotConfigured);
      return;
    }
    setBusy(true);
    try {
      const reg = await registerServiceWorker();
      if (!reg) throw new Error(t.pushUnsupported);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!res.ok) {
        await subscription.unsubscribe().catch(() => undefined);
        throw new Error((await res.json()).error || dict.lounge.common.error);
      }
      setStatus("on");
      showToast("success", t.pushEnabled);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus("off");
      showToast("success", t.pushDisabled);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return <p className="text-sm text-ink-soft">{dict.lounge.common.loading}</p>;
  if (status === "unsupported") {
    return <p className="text-sm text-ink-soft">{isIosDevice() && !isStandalone() ? t.pushUnsupportedIos : t.pushUnsupported}</p>;
  }
  if (status === "denied") return <p className="text-sm text-red-600 dark:text-red-300">{t.pushDenied}</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "on" ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
            <BellRing size={13} aria-hidden="true" /> {t.pushOn}
          </span>
          <button type="button" onClick={disable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-4 py-2 text-xs font-semibold transition hover:border-red-300 hover:text-red-500 disabled:opacity-60">
            <BellOff size={13} aria-hidden="true" /> {t.pushOff}
          </button>
        </>
      ) : (
        <button type="button" onClick={enable} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border-2 border-transparent bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          <Bell size={14} aria-hidden="true" /> {busy ? t.pushEnabling : t.pushEnable}
        </button>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useToast } from "@/components/toast-provider";

type Status = "unsupported" | "checking" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Enable/disable browser Web Push notifications for new registrations.
 *  Works from a normal browser tab (Chrome/Edge/Firefox/Android) — no PWA
 *  install required there. On iOS Safari, Apple only allows push after
 *  the site has been added to the Home Screen (Share → Add to Home
 *  Screen) — the icon/manifest for that is already set up. */
export function PushNotificationsToggle() {
  const [status, setStatus] = React.useState<Status>("checking");
  const [busy, setBusy] = React.useState(false);
  const { showToast } = useToast();

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const refreshStatus = React.useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
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
    refreshStatus();
  }, [refreshStatus]);

  async function enable() {
    if (!vapidKey) {
      showToast("error", "Push notifications aren't configured on the server yet.");
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save subscription.");

      setStatus("on");
      showToast("success", "Push notifications enabled on this device.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Could not enable notifications.");
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
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
      showToast("success", "Push notifications turned off on this device.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-ink-soft">
        This browser doesn&apos;t support push notifications. On iPhone/iPad, add this site to your Home Screen first (Share → Add to Home Screen), then try again from there.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-red-600 dark:text-red-300">
        Notifications are blocked for this site in your browser settings. Enable them from your browser&apos;s site settings, then reload this page.
      </p>
    );
  }

  if (status === "checking") {
    return <p className="text-sm text-ink-soft">Checking notification status…</p>;
  }

  return (
    <div className="flex items-center gap-3">
      {status === "on" ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
            <BellRing size={13} aria-hidden="true" /> On for this device
          </span>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-4 py-2 text-xs font-semibold text-foreground transition hover:border-red-300 hover:text-red-500 disabled:opacity-60"
          >
            <BellOff size={13} aria-hidden="true" /> Turn off
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-transparent bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          <Bell size={13} aria-hidden="true" /> {busy ? "Enabling…" : "Enable Push Notifications"}
        </button>
      )}
    </div>
  );
}

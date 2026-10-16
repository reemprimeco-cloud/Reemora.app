"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Share, CheckCircle2, Smartphone, BellRing, X } from "lucide-react";
import { isIosDevice, isStandalone, registerServiceWorker } from "@/lib/push-client";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "admin.installBanner.dismissed";

/** "Add Reemora Admin to your home screen" card. Android/Chrome/Edge get a
 *  real install button via beforeinstallprompt; iPhone/iPad need Safari's
 *  Share → Add to Home Screen, so we spell that out. Once installed, the
 *  push toggle in Settings becomes usable on iOS too (Apple only allows
 *  web push from an installed app). `compact` renders a dismissible banner
 *  for the dashboard; the full card lives in Settings. */
export function InstallAdminApp({ compact }: { compact?: boolean }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(true); // assume installed until the browser says otherwise: no flash
  const [ios, setIos] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    void registerServiceWorker();

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setDeferred(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
  }

  if (compact) {
    if (installed || dismissed) return null;
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-400/40 bg-blue-050 px-4 py-3 text-sm">
        <Smartphone size={18} className="shrink-0 text-blue-600" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <strong>Get admin alerts on your phone.</strong>{" "}
          {ios ? (
            <>
              In Safari tap <Share size={13} className="inline -mt-0.5" aria-hidden="true" /> Share → <strong>Add to Home Screen</strong>. The icon is named <strong>Reemora Admin</strong> and opens straight into this dashboard. Then enable notifications from{" "}
              <Link href="/admin/settings" className="font-semibold text-blue-600 underline">Settings</Link> inside it.
            </>
          ) : deferred ? (
            <>Install Reemora Admin as an app, then turn on push notifications in Settings.</>
          ) : (
            <>
              Add this page to your home screen, then enable push notifications in <Link href="/admin/settings" className="font-semibold text-blue-600 underline">Settings</Link>.
            </>
          )}
        </span>
        {deferred && (
          <button type="button" onClick={install} className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-800">
            <Download size={13} aria-hidden="true" /> Install
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1.5 text-ink-soft hover:bg-surface hover:text-foreground">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {installed ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 size={14} aria-hidden="true" /> Running as the installed Reemora Admin app
        </p>
      ) : deferred ? (
        <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
          <Download size={15} aria-hidden="true" /> Install Reemora Admin
        </button>
      ) : ios ? (
        <ol className="space-y-2 text-sm">
          {[
            <>Open this page in <strong>Safari</strong> (not inside another app).</>,
            <>
              Tap <Share size={14} className="inline -mt-0.5 text-blue-600" aria-hidden="true" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>. It will be named <strong>Reemora Admin</strong>.
            </>,
            <>Open it from your home screen and come back here to turn on push notifications.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-soft">Use your browser&apos;s menu → <strong>Install app</strong> / <strong>Add to Home Screen</strong>. The icon will be named Reemora Admin and open the dashboard directly.</p>
      )}
      <p className={cn("flex items-start gap-2 text-xs text-ink-soft", installed && "hidden")}>
        <BellRing size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        On iPhone and iPad, notifications only work from the installed app. Android and desktop browsers can enable them directly below.
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Download, Share, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { isIosDevice, isStandalone, registerServiceWorker } from "@/lib/push-client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "Add to Home Screen" card. Chrome/Edge/Android expose a real install
 *  prompt through beforeinstallprompt; Safari on iOS needs the manual
 *  Share → Add to Home Screen route, so we show instructions there. We
 *  never claim the app is installed unless the browser tells us so. */
export function InstallPrompt() {
  const { dict } = useLanguage();
  const t = dict.lounge.settings;
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [ios, setIos] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());
    // Registering the worker is part of what makes the site installable.
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

  if (installed) {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-xs font-bold text-green-700 dark:bg-green-950 dark:text-green-300">
        <CheckCircle2 size={14} aria-hidden="true" /> {t.installed}
      </p>
    );
  }
  if (deferred) {
    return (
      <button type="button" onClick={install} className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
        <Download size={15} aria-hidden="true" /> {t.installButton}
      </button>
    );
  }
  if (ios) {
    return (
      <p className="inline-flex items-start gap-2 text-sm text-ink-soft">
        <Share size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {t.installIos}
      </p>
    );
  }
  return <p className="text-sm text-ink-soft">{t.installUnavailable}</p>;
}

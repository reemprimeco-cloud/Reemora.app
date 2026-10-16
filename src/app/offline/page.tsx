import type { Metadata } from "next";
import Image from "next/image";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

// Served by the service worker when a navigation fails. Carries no
// per-user data, so the worker can safely keep a copy for everyone.

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-blue-600 p-6 text-center text-white">
      <div className="w-full max-w-[420px] rounded-[22px] bg-white/10 p-10 backdrop-blur-md">
        <Image src="/images/logo.png" alt="Reemora" width={130} height={34} className="mx-auto mb-6 h-8 w-auto brightness-0 invert" />
        <WifiOff className="mx-auto mb-4" size={40} aria-hidden="true" />
        <h1 className="mb-2 text-2xl font-bold">You&apos;re offline</h1>
        <p className="mb-2 text-sm text-[#c6d3ea]">The Lounge needs a connection. Check your network and try again.</p>
        <p className="text-sm text-[#c6d3ea]" dir="rtl" lang="ar">
          أنت غير متصل بالإنترنت. تحقق من الشبكة وحاول مجدداً.
        </p>
        <a href="/lounge" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy-800">
          Retry
        </a>
      </div>
    </main>
  );
}

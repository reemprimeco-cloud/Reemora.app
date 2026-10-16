import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LoungeShell } from "@/components/lounge/lounge-shell";
import { ToastProvider } from "@/components/toast-provider";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { getLoungeViewer } from "@/lib/lounge/server";

export const metadata: Metadata = {
  title: {
    default: "Reemora Lounge",
    template: "%s — Reemora Lounge",
  },
  description: "A private community for people building websites, apps and AI tools with Reemora.",
  robots: { index: false, follow: false },
};

// Everything under /lounge depends on the session cookie.
export const dynamic = "force-dynamic";

export default async function LoungeLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getLoungeViewer();
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SiteHeader />
        <main className="min-h-screen bg-surface-alt">
          <LoungeShell
            isApproved={viewer.isApproved}
            unreadCount={viewer.unreadCount}
            displayName={viewer.member?.display_name ?? null}
            avatarUrl={viewer.member?.avatar_url ?? null}
          >
            {children}
          </LoungeShell>
        </main>
      </ConfirmProvider>
    </ToastProvider>
  );
}

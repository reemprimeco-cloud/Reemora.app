import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";
import { PageHeader } from "@/components/lounge/page-header";
import { PushToggle } from "@/components/lounge/push-toggle";
import { InstallPrompt } from "@/components/lounge/install-prompt";
import { SignOutButton } from "@/components/lounge/sign-out-button";

export const metadata: Metadata = { title: "Settings" };

export default async function LoungeSettingsPage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  if (!viewer.user) redirect("/lounge/login?next=/lounge/settings");
  const t = getDict(lang).lounge.settings;

  return (
    <div className="mx-auto max-w-[680px]">
      <PageHeader title={t.title} />
      <div className="space-y-4">
        <section className="rounded-2xl border border-border-c bg-surface p-5 sm:p-6">
          <h2 className="mb-1 text-[16px] font-bold">{t.pushTitle}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t.pushBody}</p>
          <PushToggle />
        </section>
        <section className="rounded-2xl border border-border-c bg-surface p-5 sm:p-6">
          <h2 className="mb-1 text-[16px] font-bold">{t.installTitle}</h2>
          <p className="mb-4 text-sm text-ink-soft">{t.installBody}</p>
          <InstallPrompt />
        </section>
        <section className="rounded-2xl border border-border-c bg-surface p-5 sm:p-6">
          <h2 className="mb-1 text-[16px] font-bold">{t.accountTitle}</h2>
          <p className="mb-4 text-sm text-ink-soft" dir="ltr">
            {interpolate(t.accountEmail, { email: viewer.user.email ?? "" })}
          </p>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}

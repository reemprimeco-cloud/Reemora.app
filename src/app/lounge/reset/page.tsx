import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { ResetPasswordForm } from "@/components/lounge/reset-form";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Reset password" };

export default async function LoungeResetPage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  // The recovery link creates a session via /auth/callback; without one
  // there is nothing to update.
  if (!viewer.user) redirect("/lounge/login");
  const t = getDict(lang).lounge.login;
  return (
    <div className="mx-auto max-w-[480px]">
      <PageHeader eyebrow={t.eyebrow} title={t.newPasswordTitle} />
      <ResetPasswordForm />
    </div>
  );
}

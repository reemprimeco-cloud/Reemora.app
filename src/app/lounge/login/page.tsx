import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { LoginForm } from "@/components/lounge/login-form";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoungeLoginPage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  if (viewer.user) redirect("/lounge");
  const t = getDict(lang).lounge.login;
  return (
    <div className="mx-auto max-w-[480px]">
      <PageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

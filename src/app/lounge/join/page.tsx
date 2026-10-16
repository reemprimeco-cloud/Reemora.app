import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { JoinForm } from "@/components/lounge/join-form";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Join" };

export default async function LoungeJoinPage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  if (viewer.member) redirect("/lounge");
  const t = getDict(lang).lounge.join;
  return (
    <div className="mx-auto max-w-[560px]">
      <PageHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <JoinForm signedInEmail={viewer.user?.email ?? null} />
    </div>
  );
}

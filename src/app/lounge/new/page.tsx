import type { Metadata } from "next";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { PostComposer } from "@/components/lounge/post-composer";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const viewer = await requireApprovedPage("/lounge/new");
  const lang = await getLang();
  const t = getDict(lang).lounge.compose;
  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title={t.title} />
      <PostComposer userId={viewer.user!.id} />
    </div>
  );
}

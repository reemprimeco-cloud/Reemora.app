import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { PostComposer } from "@/components/lounge/post-composer";
import { PageHeader } from "@/components/lounge/page-header";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit post" };

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const viewer = await requireApprovedPage(`/lounge/posts/${id}/edit`);
  const lang = await getLang();
  const t = getDict(lang).lounge.compose;

  const supabase = await createClient();
  const { data: post } = await supabase.from("lounge_posts").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();
  if (post.author_id !== viewer.user!.id) redirect(`/lounge/posts/${id}`);

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title={t.editTitle} />
      <PostComposer userId={viewer.user!.id} existing={post} />
    </div>
  );
}

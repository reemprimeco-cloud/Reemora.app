import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { loadPost } from "@/lib/lounge/feed";
import { PostCard } from "@/components/lounge/post-card";
import { Comments, type CommentWithAuthor } from "@/components/lounge/comments";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Post" };
const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const viewer = await requireApprovedPage(`/lounge/posts/${id}`);
  const lang = await getLang();
  const dict = getDict(lang).lounge;

  const [post, supabase] = await Promise.all([loadPost(id, viewer.user!.id), createClient()]);
  if (!post) notFound();

  const { data: comments } = await supabase
    .from("lounge_comments")
    .select("*, author:lounge_members!lounge_comments_author_id_fkey(user_id, display_name, avatar_url, is_verified, badge_label)")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/lounge" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-blue-600">
        <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" /> {dict.common.back}
      </Link>
      <div className="space-y-5">
        <PostCard post={post} viewerId={viewer.user!.id} isAdmin={viewer.isAdmin} full />
        <Comments postId={post.id} postAuthorId={post.author_id} postType={post.type} initial={(comments ?? []) as unknown as CommentWithAuthor[]} viewerId={viewer.user!.id} isAdmin={viewer.isAdmin} />
      </div>
    </div>
  );
}

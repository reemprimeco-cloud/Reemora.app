"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Link2, ExternalLink, Trash2, Pencil, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { AwardBadges } from "@/components/lounge/award-badge";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { ReportButton } from "@/components/lounge/report-button";
import { memberHref, postHref, timeAgo, hostOf } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/lounge/feed";

const TYPE_STYLE: Record<FeedPost["type"], string> = {
  discussion: "bg-blue-100 text-blue-600",
  question: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  project: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  milestone: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  tool: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function PostCard({ post, viewerId, isAdmin, full, compact }: { post: FeedPost; viewerId: string; isAdmin: boolean; full?: boolean; compact?: boolean }) {
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const t = dict.lounge.feed;
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [liked, setLiked] = React.useState(post.liked);
  const [likeCount, setLikeCount] = React.useState(post.like_count);
  const [bookmarked, setBookmarked] = React.useState(post.bookmarked);
  const [deleted, setDeleted] = React.useState(false);

  const typeLabel = { discussion: t.typeDiscussion, question: t.typeQuestion, project: t.typeProject, milestone: t.typeMilestone, tool: t.typeTool }[post.type];
  const statusLabel = post.project_status ? { prototype: t.statusPrototype, in_progress: t.statusInProgress, completed: t.statusCompleted }[post.project_status] : null;
  const isOwner = post.author_id === viewerId;

  async function toggle(kind: "like" | "bookmark") {
    const next = kind === "like" ? !liked : !bookmarked;
    if (kind === "like") {
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    } else setBookmarked(next);
    try {
      const res = await fetch(`/api/lounge/posts/${post.id}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (kind === "like") {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      } else setBookmarked(data.bookmarked);
    } catch (err) {
      if (kind === "like") {
        setLiked(!next);
        setLikeCount(post.like_count);
      } else setBookmarked(!next);
      showToast("error", err instanceof Error && err.message ? err.message : dict.lounge.common.error);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${postHref(post.id)}`);
      showToast("success", t.linkCopied);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function remove() {
    if (!(await confirm(t.deleteConfirm, t.delete))) return;
    const res = await fetch(`/api/lounge/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("error", dict.lounge.common.error);
      return;
    }
    showToast("success", t.deleted);
    setDeleted(true);
    if (full) router.push("/lounge");
  }

  if (deleted) return null;

  const images = [post.image_url, ...post.gallery_urls].filter((u): u is string => Boolean(u));
  const shownImages = full ? images : images.slice(0, 1);

  return (
    <article className={cn("rounded-2xl border border-border-c bg-surface", compact ? "p-4" : "p-5 sm:p-6", post.is_hidden && "opacity-70")}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={memberHref(post.author.user_id)} className="shrink-0">
            <Avatar name={post.author.display_name} src={post.author.avatar_url} size="sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={memberHref(post.author.user_id)} className="truncate text-sm font-bold hover:text-blue-600">
                {post.author.display_name}
              </Link>
              <VerifiedBadge verified={post.author.is_verified} label={post.author.badge_label} size="sm" />
              <AwardBadges badges={post.author.badges} size="xs" lang={lang} />
            </div>
            <p className="text-xs text-ink-soft">
              <time dateTime={post.created_at}>{timeAgo(post.created_at, dict.lounge.common, lang)}</time>
              {post.updated_at !== post.created_at && " · ✎"}
            </p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_STYLE[post.type])}>{typeLabel}</span>
      </header>

      {post.is_hidden && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">
          <EyeOff size={12} aria-hidden="true" /> {t.hidden}
          {post.hidden_reason && <> — {post.hidden_reason}</>}
        </p>
      )}

      {full ? (
        <h1 className="mb-2 text-[22px] font-bold leading-tight sm:text-[26px]">{post.title}</h1>
      ) : (
        <h2 className="mb-2 text-[17px] font-bold leading-snug">
          <Link href={postHref(post.id)} className="hover:text-blue-600">
            {post.title}
          </Link>
        </h2>
      )}

      <p className={cn("whitespace-pre-line text-[15px] leading-relaxed text-foreground/90", !full && "line-clamp-4")}>{post.body}</p>
      {!full && post.body.length > 280 && (
        <Link href={postHref(post.id)} className="mt-1 inline-block text-sm font-semibold text-blue-600 hover:underline">
          …
        </Link>
      )}

      {shownImages.length > 0 && (
        <div className={cn("mt-4 grid gap-2", shownImages.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {shownImages.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading="lazy" className="max-h-[420px] w-full rounded-xl border border-border-c object-cover" />
          ))}
        </div>
      )}

      {(post.project_url || post.tools.length > 0 || statusLabel) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {post.project_url && (
            <a href={post.project_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600">
              <ExternalLink size={12} aria-hidden="true" /> {t.visitProject} · {hostOf(post.project_url)}
            </a>
          )}
          {statusLabel && <span className="rounded-full border border-border-c px-3 py-1.5 text-xs font-semibold">{statusLabel}</span>}
          {post.tools.map((tool) => (
            <span key={tool} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{tool}</span>
          ))}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-border-c pt-3">
        <button type="button" onClick={() => toggle("like")} aria-pressed={liked} aria-label={liked ? t.unlike : t.like} className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition hover:bg-surface-alt", liked ? "text-red-500" : "text-ink-soft")}>
          <Heart size={17} className={liked ? "fill-current" : ""} aria-hidden="true" /> {likeCount}
        </button>
        <Link href={`${postHref(post.id)}#comments`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft transition hover:bg-surface-alt">
          <MessageCircle size={17} aria-hidden="true" /> {post.comment_count}
        </Link>
        <button type="button" onClick={() => toggle("bookmark")} aria-pressed={bookmarked} aria-label={bookmarked ? t.unbookmark : t.bookmark} className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition hover:bg-surface-alt", bookmarked ? "text-blue-600" : "text-ink-soft")}>
          <Bookmark size={17} className={bookmarked ? "fill-current" : ""} aria-hidden="true" />
        </button>
        <button type="button" onClick={copyLink} aria-label={t.share} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft transition hover:bg-surface-alt">
          <Link2 size={17} aria-hidden="true" />
        </button>
        <span className="ms-auto flex items-center gap-2">
          {isOwner && (
            <Link href={`/lounge/posts/${post.id}/edit`} aria-label={t.edit} className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-soft hover:bg-surface-alt">
              <Pencil size={13} aria-hidden="true" /> {t.edit}
            </Link>
          )}
          {(isOwner || isAdmin) && (
            <button type="button" onClick={remove} aria-label={t.delete} className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-xs font-semibold text-ink-soft hover:bg-surface-alt hover:text-red-500">
              <Trash2 size={13} aria-hidden="true" /> {t.delete}
            </button>
          )}
          {!isOwner && <ReportButton targetType="post" targetId={post.id} compact />}
        </span>
      </footer>
    </article>
  );
}

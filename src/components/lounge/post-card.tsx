"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Link2, ExternalLink, Trash2, Pencil, EyeOff, Globe, Images, Copyright } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { AwardBadges } from "@/components/lounge/award-badge";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { ReportButton } from "@/components/lounge/report-button";
import { memberHref, postHref, timeAgo, hostOf } from "@/lib/lounge/utils";
import { mediaSrc } from "@/lib/lounge/media";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/lounge/feed";

const TYPE_STYLE: Record<FeedPost["type"], string> = {
  discussion: "bg-blue-100 text-blue-600",
  question: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  project: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  milestone: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  tool: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

/** Gradient "cover" for posts that have a link but no screenshot, keyed by
 *  project category so a feed of link-only posts still reads visually. */
const COVER_STYLE: Record<string, string> = {
  website: "from-navy-900 via-navy-800 to-blue-600",
  app: "from-blue-600 via-navy-800 to-navy-900",
  ai: "from-purple-700 via-navy-800 to-navy-900",
  automation: "from-emerald-700 via-navy-800 to-navy-900",
  productivity: "from-amber-600 via-navy-800 to-navy-900",
  other: "from-navy-800 via-navy-700 to-blue-600",
};

/** Instagram-style card: who, then the thing itself (screenshot or link
 *  cover), then actions, then the caption. The media is the hero because
 *  members share apps, sites and content, not text. */
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
  const [slide, setSlide] = React.useState(0);
  const [expanded, setExpanded] = React.useState(Boolean(full));

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

  const images = [post.image_url, ...post.gallery_urls].filter((u): u is string => Boolean(u)).map((u) => mediaSrc(u) ?? u);
  const copyright = post.type === "project" ? interpolate(t.copyright, { year: new Date(post.created_at).getFullYear(), name: post.author.display_name }) : null;
  const hasMedia = images.length > 0;
  const showCover = !hasMedia && Boolean(post.project_url);
  const longBody = post.body.length > 220;
  const padX = compact ? "px-4" : "px-4 sm:px-5";

  const Title = full ? "h1" : "h2";

  return (
    <article className={cn("overflow-hidden rounded-2xl border border-border-c bg-surface", post.is_hidden && "opacity-70")}>
      {/* Header: author */}
      <header className={cn("flex items-center justify-between gap-3 py-3", padX)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={memberHref(post.author.user_id)} className="shrink-0 rounded-full ring-2 ring-blue-400/40 ring-offset-2 ring-offset-surface">
            <Avatar name={post.author.display_name} src={post.author.avatar_url} size="sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={memberHref(post.author.user_id)} className="truncate text-[14px] font-bold hover:text-blue-600">
                {post.author.display_name}
              </Link>
              <VerifiedBadge verified={post.author.is_verified} label={post.author.badge_label} size="sm" />
              <AwardBadges badges={post.author.badges} size="xs" lang={lang} />
            </div>
            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
              <time dateTime={post.created_at}>{timeAgo(post.created_at, dict.lounge.common, lang)}</time>
              {post.updated_at !== post.created_at && <span aria-hidden="true">· ✎</span>}
              {post.project_url && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Globe size={11} aria-hidden="true" /> {hostOf(post.project_url)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", TYPE_STYLE[post.type])}>{typeLabel}</span>
      </header>

      {post.is_hidden && (
        <p className={cn("mb-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:bg-red-950 dark:text-red-300", padX)}>
          <EyeOff size={12} aria-hidden="true" /> {t.hidden}
          {post.hidden_reason && <> — {post.hidden_reason}</>}
        </p>
      )}

      {/* Media: screenshots, swipeable on phones */}
      {hasMedia && (
        <div className="relative bg-navy-900/5">
          <div
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
            onScroll={(e) => {
              const el = e.currentTarget;
              setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
          >
            {(full ? images : images.slice(0, 6)).map((src, i) => (
              <Link key={src} href={full ? src : postHref(post.id)} target={full ? "_blank" : undefined} className="w-full shrink-0 snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} className={cn("w-full object-cover", full ? "max-h-[640px]" : "aspect-[4/3] sm:aspect-[16/10]")} />
              </Link>
            ))}
          </div>
          {copyright && (
            <span className="pointer-events-none absolute bottom-2 start-2 rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm" dir="auto">
              © {post.author.display_name} · Reemora Lounge
            </span>
          )}
          {images.length > 1 && (
            <>
              <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                <Images size={12} aria-hidden="true" /> {Math.abs(slide) + 1}/{images.length}
              </span>
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
                {images.map((_, i) => (
                  <span key={i} className={cn("h-1.5 w-1.5 rounded-full bg-white/90 shadow", i !== Math.abs(slide) && "opacity-50")} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Link cover for projects without a screenshot */}
      {showCover && (
        <a href={post.project_url!} target="_blank" rel="noopener noreferrer nofollow" className={cn("relative block overflow-hidden bg-gradient-to-br text-white", COVER_STYLE[post.project_category ?? "other"] ?? COVER_STYLE.other)}>
          <div className="pointer-events-none absolute -end-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="flex min-h-[150px] flex-col justify-end p-5 sm:min-h-[170px]">
            <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur" dir="ltr">
              <Globe size={12} aria-hidden="true" /> {hostOf(post.project_url!)}
            </span>
            <span className="text-[20px] font-bold leading-tight sm:text-[22px]">{post.title}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/80">
              {t.visitProject} <ExternalLink size={12} aria-hidden="true" />
            </span>
          </div>
        </a>
      )}

      {/* Actions */}
      <div className={cn("flex items-center gap-0.5 pt-1.5", padX)}>
        <button type="button" onClick={() => toggle("like")} aria-pressed={liked} aria-label={liked ? t.unlike : t.like} className={cn("inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition hover:bg-surface-alt active:scale-90", liked ? "text-red-500" : "text-foreground")}>
          <Heart size={23} className={liked ? "fill-current" : ""} aria-hidden="true" />
        </button>
        <Link href={`${postHref(post.id)}#comments`} aria-label={t.comments} className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-foreground transition hover:bg-surface-alt">
          <MessageCircle size={23} aria-hidden="true" />
        </Link>
        <button type="button" onClick={copyLink} aria-label={t.share} className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full text-foreground transition hover:bg-surface-alt">
          <Link2 size={23} aria-hidden="true" />
        </button>
        {post.project_url && !showCover && (
          <a href={post.project_url} target="_blank" rel="noopener noreferrer nofollow" className="ms-1 inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-600">
            <ExternalLink size={12} aria-hidden="true" /> {t.visitProject}
          </a>
        )}
        <button type="button" onClick={() => toggle("bookmark")} aria-pressed={bookmarked} aria-label={bookmarked ? t.unbookmark : t.bookmark} className={cn("ms-auto inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition hover:bg-surface-alt", bookmarked ? "text-blue-600" : "text-foreground")}>
          <Bookmark size={23} className={bookmarked ? "fill-current" : ""} aria-hidden="true" />
        </button>
      </div>

      {/* Caption */}
      <div className={cn("pb-4", padX)}>
        {likeCount > 0 && (
          <p className="text-[13px] font-bold">
            {likeCount} {likeCount === 1 ? t.like.toLowerCase() : t.like.toLowerCase() + (lang === "en" ? "s" : "")}
          </p>
        )}
        <Title className={cn("mt-1 font-bold leading-snug", full ? "text-[22px] sm:text-[26px]" : "text-[16px]")}>
          {full ? post.title : (
            <Link href={postHref(post.id)} className="hover:text-blue-600">
              {post.title}
            </Link>
          )}
        </Title>
        <p className={cn("mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-foreground/90", !expanded && "line-clamp-3")}>{post.body}</p>
        {!expanded && longBody && (
          <button type="button" onClick={() => setExpanded(true)} className="mt-0.5 text-[13px] font-semibold text-ink-soft hover:text-blue-600">
            … {t.moreText}
          </button>
        )}

        {(post.tools.length > 0 || statusLabel) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {statusLabel && <span className="rounded-full border border-border-c px-2.5 py-1 text-[11px] font-semibold">{statusLabel}</span>}
            {post.tools.map((tool) => (
              <span key={tool} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{tool}</span>
            ))}
          </div>
        )}

        {copyright && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-surface-alt px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
            <Copyright size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{copyright}</span>
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[13px] text-ink-soft">
          {!full && post.comment_count > 0 && (
            <Link href={`${postHref(post.id)}#comments`} className="font-semibold hover:text-blue-600">
              {interpolate(t.viewAllComments, { n: post.comment_count })}
            </Link>
          )}
          <span className="ms-auto flex items-center gap-2">
            {isOwner && (
              <Link href={`/lounge/posts/${post.id}/edit`} aria-label={t.edit} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold hover:bg-surface-alt">
                <Pencil size={12} aria-hidden="true" /> {t.edit}
              </Link>
            )}
            {(isOwner || isAdmin) && (
              <button type="button" onClick={remove} aria-label={t.delete} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold hover:bg-surface-alt hover:text-red-500">
                <Trash2 size={12} aria-hidden="true" /> {t.delete}
              </button>
            )}
            {!isOwner && <ReportButton targetType="post" targetId={post.id} compact />}
          </span>
        </div>
      </div>
    </article>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Reply, Trash2, Heart, Wrench, Lightbulb, Code2, Palette, Sparkles, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { ReportButton } from "@/components/lounge/report-button";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { inputClass } from "@/components/lounge/form-field";
import { memberHref, timeAgo } from "@/lib/lounge/utils";
import { COMMENT_CATEGORIES } from "@/lib/lounge/validation";
import { cn } from "@/lib/utils";
import type { LoungeCommentRow, LoungeCommentCategory } from "@/lib/supabase/lounge.types";

type CommentAuthor = { user_id: string; display_name: string; avatar_url: string | null; is_verified?: boolean; badge_label?: string | null };
export interface CommentWithAuthor extends LoungeCommentRow {
  author: CommentAuthor | CommentAuthor[] | null;
}

function authorOf(c: CommentWithAuthor): CommentAuthor {
  const a = Array.isArray(c.author) ? c.author[0] : c.author;
  return a ?? { user_id: c.author_id, display_name: "Member", avatar_url: null };
}

type CategoryKey = LoungeCommentCategory | "general";

/** Visual identity per feedback bucket. Order on screen is COMMENT_CATEGORIES
 *  (the order the author reads them in), then uncategorised. */
const CATEGORY_UI: Record<CategoryKey, { icon: typeof Heart; chip: string; ring: string }> = {
  like: { icon: Heart, chip: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300", ring: "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" },
  needs_work: { icon: Wrench, chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", ring: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" },
  suggestion: { icon: Lightbulb, chip: "bg-blue-100 text-blue-600", ring: "border-blue-400 bg-blue-050 dark:border-blue-600 dark:bg-blue-050" },
  code: { icon: Code2, chip: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300", ring: "border-slate-400 bg-slate-50 dark:border-slate-600 dark:bg-slate-900" },
  design: { icon: Palette, chip: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", ring: "border-purple-300 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/40" },
  tip: { icon: Sparkles, chip: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", ring: "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40" },
  general: { icon: MessageSquare, chip: "bg-surface-alt text-ink-soft", ring: "border-border-c bg-surface-alt" },
};

export function Comments({
  postId,
  postAuthorId,
  postType,
  initial,
  viewerId,
  isAdmin,
}: {
  postId: string;
  postAuthorId: string;
  postType?: string;
  initial: CommentWithAuthor[];
  viewerId: string;
  isAdmin: boolean;
}) {
  const { dict, lang } = useLanguage();
  const t = dict.lounge.feed;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = React.useState(initial);
  const [body, setBody] = React.useState("");
  const [category, setCategory] = React.useState<LoungeCommentCategory | null>(null);
  const [replyTo, setReplyTo] = React.useState<CommentWithAuthor | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const structured = postType === "project";
  const labels: Record<CategoryKey, string> = {
    like: t.catLike,
    needs_work: t.catNeedsWork,
    suggestion: t.catSuggestion,
    code: t.catCode,
    design: t.catDesign,
    tip: t.catTip,
    general: t.catGeneral,
  };

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
  const canMarkHelpful = viewerId === postAuthorId || isAdmin;

  // Group root comments by bucket, in the fixed reading order.
  const sections: { key: CategoryKey; items: CommentWithAuthor[] }[] = structured
    ? [...COMMENT_CATEGORIES.map((k): { key: CategoryKey; items: CommentWithAuthor[] } => ({ key: k, items: roots.filter((c) => c.category === k) })), { key: "general" as const, items: roots.filter((c) => !c.category) }].filter((s) => s.items.length > 0)
    : [{ key: "general" as const, items: roots }];

  const needsCategory = structured && !replyTo && !category;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 1 || busy || needsCategory) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lounge/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, parentId: replyTo ? replyTo.parent_id ?? replyTo.id : null, body: body.trim(), category: replyTo ? null : category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((prev) => [...prev, data.comment]);
      setBody("");
      setReplyTo(null);
      setCategory(null);
    } catch (err) {
      showToast("error", err instanceof Error && err.message ? err.message : dict.lounge.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggleHelpful(c: CommentWithAuthor) {
    const res = await fetch(`/api/lounge/comments/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ helpful: !c.is_helpful }) });
    const data = await res.json();
    if (!res.ok) {
      showToast("error", data.error || dict.lounge.common.error);
      return;
    }
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_helpful: data.helpful } : x)));
  }

  async function remove(c: CommentWithAuthor) {
    if (!(await confirm(t.deleteConfirm, t.delete))) return;
    const res = await fetch(`/api/lounge/comments/${c.id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("error", dict.lounge.common.error);
      return;
    }
    setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    showToast("success", t.commentDeleted);
  }

  function startReply(c: CommentWithAuthor) {
    setReplyTo(c);
    inputRef.current?.focus();
  }

  function Item({ c, isReply }: { c: CommentWithAuthor; isReply?: boolean }) {
    const a = authorOf(c);
    const own = c.author_id === viewerId;
    const ui = CATEGORY_UI[(c.category ?? "general") as CategoryKey];
    return (
      <div id={`comment-${c.id}`} className={cn("flex gap-3", isReply && "ms-9 sm:ms-12")}>
        <Link href={memberHref(a.user_id)} className="shrink-0">
          <Avatar name={a.display_name} src={a.avatar_url} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className={cn("rounded-2xl px-4 py-3", c.is_helpful ? "border border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950" : structured && c.category && !isReply ? cn("border", ui.ring) : "bg-surface-alt")}>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
              <Link href={memberHref(a.user_id)} className="font-bold text-foreground hover:text-blue-600">
                {a.display_name}
              </Link>
              <VerifiedBadge verified={a.is_verified} label={a.badge_label} size="xs" />
              {a.user_id === postAuthorId && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">OP</span>}
              <time dateTime={c.created_at} className="text-ink-soft">
                {timeAgo(c.created_at, dict.lounge.common, lang)}
              </time>
              {c.is_helpful && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 size={11} aria-hidden="true" /> {t.helpful}
                </span>
              )}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 px-2 text-xs text-ink-soft">
            {!isReply && (
              <button type="button" onClick={() => startReply(c)} className="inline-flex items-center gap-1 font-semibold hover:text-blue-600">
                <Reply size={12} aria-hidden="true" /> {t.replyTo}
              </button>
            )}
            {canMarkHelpful && !own && (
              <button type="button" onClick={() => toggleHelpful(c)} className="inline-flex items-center gap-1 font-semibold hover:text-green-700">
                <CheckCircle2 size={12} aria-hidden="true" /> {c.is_helpful ? t.unmarkHelpful : t.markHelpful}
              </button>
            )}
            {(own || isAdmin) && (
              <button type="button" onClick={() => remove(c)} className="inline-flex items-center gap-1 font-semibold hover:text-red-500">
                <Trash2 size={12} aria-hidden="true" /> {t.delete}
              </button>
            )}
            {!own && <ReportButton targetType="comment" targetId={c.id} compact />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="comments" className="rounded-2xl border border-border-c bg-surface p-5 sm:p-6">
      <h2 className="mb-5 text-lg font-bold">
        {t.comments} <span className="text-ink-soft">({comments.length})</span>
      </h2>

      {/* Category summary strip: one glance tells the builder what came in. */}
      {structured && roots.length > 0 && (
        <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {sections.map((s) => {
            const Icon = CATEGORY_UI[s.key].icon;
            return (
              <a key={s.key} href={`#comments-${s.key}`} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold", CATEGORY_UI[s.key].chip)}>
                <Icon size={13} aria-hidden="true" /> {labels[s.key]} <span className="opacity-70">{s.items.length}</span>
              </a>
            );
          })}
        </div>
      )}

      {roots.length === 0 ? (
        <p className="mb-5 text-sm text-ink-soft">{t.noComments}</p>
      ) : (
        <div className="mb-6 space-y-7">
          {sections.map((s) => {
            const Icon = CATEGORY_UI[s.key].icon;
            return (
              <div key={s.key} id={`comments-${s.key}`} className="scroll-mt-28">
                {structured && (
                  <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
                    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", CATEGORY_UI[s.key].chip)}>
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    {labels[s.key]} <span className="font-semibold opacity-70">({s.items.length})</span>
                  </h3>
                )}
                <div className="space-y-5">
                  {s.items.map((c) => (
                    <div key={c.id} className="space-y-3">
                      <Item c={c} />
                      {repliesOf(c.id).map((r) => (
                        <Item key={r.id} c={r} isReply />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className="border-t border-border-c pt-5">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-blue-100 px-3 py-2 text-xs text-blue-700">
            <span>
              {t.replyTo}: <strong>{authorOf(replyTo).display_name}</strong>
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="font-semibold hover:underline">
              {dict.lounge.common.cancel}
            </button>
          </div>
        )}

        {structured && !replyTo && (
          <fieldset className="mb-3">
            <legend className="mb-2 text-[13px] font-semibold">
              {t.feedbackType} <span className="font-normal text-ink-soft">· {t.catHint}</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {COMMENT_CATEGORIES.map((k) => {
                const Icon = CATEGORY_UI[k].icon;
                const active = category === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCategory(active ? null : k)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition",
                      active ? cn("border-transparent", CATEGORY_UI[k].chip, "ring-2 ring-blue-400/40") : "border-border-c bg-surface text-foreground hover:border-blue-400"
                    )}
                  >
                    <Icon size={13} aria-hidden="true" /> {labels[k]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label htmlFor="comment-body" className="sr-only">
          {replyTo ? t.writeReply : t.writeComment}
        </label>
        <textarea ref={inputRef} id="comment-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder={replyTo ? t.writeReply : t.writeComment} className={inputClass(false, "min-h-[90px]")} />
        <div className="mt-3 flex items-center justify-end gap-3">
          {needsCategory && body.trim().length > 0 && <span className="text-xs text-ink-soft">{t.feedbackType}</span>}
          <button type="submit" disabled={busy || body.trim().length < 1 || needsCategory} className="rounded-full border-2 border-transparent bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
            {busy ? t.posting : t.postComment}
          </button>
        </div>
      </form>
    </section>
  );
}

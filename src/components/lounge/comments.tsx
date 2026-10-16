"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Reply, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { Avatar } from "@/components/lounge/avatar";
import { ReportButton } from "@/components/lounge/report-button";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { inputClass } from "@/components/lounge/form-field";
import { memberHref, timeAgo } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";
import type { LoungeCommentRow } from "@/lib/supabase/lounge.types";

type CommentAuthor = { user_id: string; display_name: string; avatar_url: string | null; is_verified?: boolean; badge_label?: string | null };
export interface CommentWithAuthor extends LoungeCommentRow {
  author: CommentAuthor | CommentAuthor[] | null;
}

function authorOf(c: CommentWithAuthor): CommentAuthor {
  const a = Array.isArray(c.author) ? c.author[0] : c.author;
  return a ?? { user_id: c.author_id, display_name: "Member", avatar_url: null };
}

export function Comments({ postId, postAuthorId, initial, viewerId, isAdmin }: { postId: string; postAuthorId: string; initial: CommentWithAuthor[]; viewerId: string; isAdmin: boolean }) {
  const { dict, lang } = useLanguage();
  const t = dict.lounge.feed;
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = React.useState(initial);
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<CommentWithAuthor | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
  const canMarkHelpful = viewerId === postAuthorId || isAdmin;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 1 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lounge/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, parentId: replyTo ? replyTo.parent_id ?? replyTo.id : null, body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((prev) => [...prev, data.comment]);
      setBody("");
      setReplyTo(null);
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
    return (
      <div id={`comment-${c.id}`} className={cn("flex gap-3", isReply && "ms-9 sm:ms-12")}>
        <Link href={memberHref(a.user_id)} className="shrink-0">
          <Avatar name={a.display_name} src={a.avatar_url} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className={cn("rounded-2xl px-4 py-3", c.is_helpful ? "border border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950" : "bg-surface-alt")}>
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

      {roots.length === 0 ? (
        <p className="mb-5 text-sm text-ink-soft">{t.noComments}</p>
      ) : (
        <div className="mb-6 space-y-5">
          {roots.map((c) => (
            <div key={c.id} className="space-y-3">
              <Item c={c} />
              {repliesOf(c.id).map((r) => (
                <Item key={r.id} c={r} isReply />
              ))}
            </div>
          ))}
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
        <label htmlFor="comment-body" className="sr-only">
          {replyTo ? t.writeReply : t.writeComment}
        </label>
        <textarea ref={inputRef} id="comment-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder={replyTo ? t.writeReply : t.writeComment} className={inputClass(false, "min-h-[90px]")} />
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy || body.trim().length < 1} className="rounded-full border-2 border-transparent bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50">
            {busy ? t.posting : t.postComment}
          </button>
        </div>
      </form>
    </section>
  );
}

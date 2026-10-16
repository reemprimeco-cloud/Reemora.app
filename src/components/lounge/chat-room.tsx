"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Reply, X, Wifi, WifiOff, ImagePlus, Paperclip, FileText, Download } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { compressImage, formatBytes, LOUNGE_FILES_MAX_BYTES } from "@/lib/compress-image";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useToast } from "@/components/toast-provider";
import { Avatar } from "@/components/lounge/avatar";
import { ReportButton } from "@/components/lounge/report-button";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { memberHref, timeAgo } from "@/lib/lounge/utils";
import { mediaSrc, mediaDownloadHref } from "@/lib/lounge/media";
import { CHAT_MAX_LENGTH } from "@/lib/lounge/validation";
import { cn } from "@/lib/utils";
import type { LoungeChatMessageRow, LoungeChatAttachmentType } from "@/lib/supabase/lounge.types";

type AuthorInfo = { user_id: string; display_name: string; avatar_url: string | null; is_verified?: boolean; badge_label?: string | null };
export interface ChatMessage extends LoungeChatMessageRow {
  author: AuthorInfo | AuthorInfo[] | null;
}

type Status = "connecting" | "live" | "reconnecting";
type Pending = { url: string; type: LoungeChatAttachmentType; name: string; size: number };

const FILE_ACCEPT = ".pdf,.zip,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/zip,text/plain,text/markdown,text/csv,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const ALLOWED_FILE_TYPES = new Set(FILE_ACCEPT.split(",").filter((s) => s.includes("/")));

function authorOf(m: ChatMessage, cache: Map<string, AuthorInfo>): AuthorInfo {
  const a = Array.isArray(m.author) ? m.author[0] : m.author;
  return a ?? cache.get(m.author_id) ?? { user_id: m.author_id, display_name: "Member", avatar_url: null };
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-؀-ۿ ]+/g, "_").slice(0, 80) || "file";
}

export function ChatRoom({ initialMessages, viewerId, muted }: { initialMessages: ChatMessage[]; viewerId: string; muted: boolean }) {
  const { dict, lang } = useLanguage();
  const t = dict.lounge.chat;
  const { showToast } = useToast();

  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = React.useState<Status>("connecting");
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<ChatMessage | null>(null);
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasOlder, setHasOlder] = React.useState(initialMessages.length >= 50);
  const listRef = React.useRef<HTMLDivElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const authorsRef = React.useRef(new Map<string, AuthorInfo>());
  const stickToBottom = React.useRef(true);

  React.useEffect(() => {
    for (const m of messages) {
      const a = Array.isArray(m.author) ? m.author[0] : m.author;
      if (a) authorsRef.current.set(a.user_id, a);
    }
  }, [messages]);

  const scrollToBottom = React.useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  React.useEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription with gap-fill on (re)connect.
  React.useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    async function resolveAuthor(id: string): Promise<AuthorInfo> {
      const cached = authorsRef.current.get(id);
      if (cached) return cached;
      const { data } = await supabase.from("lounge_members").select("user_id, display_name, avatar_url, is_verified, badge_label").eq("user_id", id).maybeSingle();
      const info = data ?? { user_id: id, display_name: "Member", avatar_url: null };
      authorsRef.current.set(id, info);
      return info;
    }

    async function fillGap() {
      const last = messages[messages.length - 1]?.created_at;
      const res = await fetch(`/api/lounge/chat${last ? `?after=${encodeURIComponent(last)}` : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming = (data.messages as ChatMessage[]).filter((m) => !last || m.created_at > last);
      if (incoming.length && !cancelled) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
      }
    }

    channel = supabase
      .channel("lounge-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lounge_chat_messages" }, async (payload) => {
        const row = payload.new as LoungeChatMessageRow;
        if (row.is_hidden) return;
        const author = await resolveAuthor(row.author_id);
        if (cancelled) return;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, { ...row, author }]));
      })
      .subscribe((state) => {
        if (cancelled) return;
        if (state === "SUBSCRIBED") {
          setStatus((prev) => {
            if (prev === "reconnecting") void fillGap();
            return "live";
          });
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("reconnecting");
        }
      });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Upload a picked file to the member's folder in lounge-files and hold
   *  it as a pending attachment until the message is sent. */
  async function attach(file: File | undefined, kind: LoungeChatAttachmentType) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      let upload: File = file;
      if (kind === "image") {
        if (!file.type.startsWith("image/")) throw new Error(t.attachUnsupported);
        upload = await compressImage(file, { maxEdge: 1600, targetBytes: 1.2 * 1024 * 1024 });
      } else if (file.type && !ALLOWED_FILE_TYPES.has(file.type) && !file.type.startsWith("image/")) {
        throw new Error(t.attachUnsupported);
      }
      if (upload.size > LOUNGE_FILES_MAX_BYTES) throw new Error(interpolate(t.attachTooLarge, { n: String(LOUNGE_FILES_MAX_BYTES / (1024 * 1024)) }));

      const supabase = createClient();
      const path = `${viewerId}/chat-${Date.now()}-${safeFileName(upload.name)}`;
      const { error } = await supabase.storage.from("lounge-files").upload(path, upload, { upsert: false, contentType: upload.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("lounge-files").getPublicUrl(path);
      setPending({ url: data.publicUrl, type: upload.type.startsWith("image/") ? "image" : "file", name: file.name.slice(0, 200), size: upload.size });
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if ((!text && !pending) || sending || uploading) return;
    if (text.length > CHAT_MAX_LENGTH) {
      showToast("error", interpolate(t.tooLong, { n: CHAT_MAX_LENGTH }));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/lounge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, replyToId: replyTo?.id ?? null, attachment: pending }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "rate_limited") throw new Error(t.rateLimited);
        if (data.error === "chat_muted") throw new Error(t.muted);
        throw new Error(data.error || dict.lounge.common.error);
      }
      stickToBottom.current = true;
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
      setBody("");
      setReplyTo(null);
      setPending(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setSending(false);
    }
  }

  async function loadOlder() {
    const first = messages[0];
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/lounge/chat?before=${encodeURIComponent(first.created_at)}`);
      const data = await res.json();
      const older = (data.messages ?? []) as ChatMessage[];
      setHasOlder(older.length >= 50);
      if (older.length) {
        stickToBottom.current = false;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !seen.has(m.id)), ...prev];
        });
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  }

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  const previewOf = (m: ChatMessage) => m.body || (m.attachment_name ? `📎 ${m.attachment_name}` : "");

  function Attachment({ m, own }: { m: ChatMessage; own: boolean }) {
    if (!m.attachment_url) return null;
    if (m.attachment_type === "image") {
      return (
        <a href={mediaSrc(m.attachment_url) ?? undefined} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaSrc(m.attachment_url) ?? undefined} alt={t.imageAlt} loading="lazy" className="max-h-72 w-auto max-w-full rounded-xl border border-black/5 object-cover" />
        </a>
      );
    }
    return (
      <a
        href={mediaDownloadHref(m.attachment_url, m.attachment_name) ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        dir="ltr"
        className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2 text-start text-xs transition", own ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "border-border-c bg-surface hover:border-blue-400")}
      >
        <FileText size={18} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{m.attachment_name}</span>
          {m.attachment_size != null && <span className="opacity-70">{formatBytes(m.attachment_size)}</span>}
        </span>
        <Download size={14} className="shrink-0 opacity-80" aria-label={t.download} />
      </a>
    );
  }

  const canSend = (Boolean(body.trim()) || Boolean(pending)) && !sending && !uploading;

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[460px] flex-col overflow-hidden rounded-[22px] border border-border-c bg-surface md:h-[calc(100dvh-200px)]">
      <div className="flex items-center justify-between border-b border-border-c px-4 py-2.5 text-xs">
        <span className={cn("inline-flex items-center gap-1.5 font-semibold", status === "live" ? "text-green-700 dark:text-green-400" : "text-amber-600")}>
          {status === "live" ? <Wifi size={13} aria-hidden="true" /> : <WifiOff size={13} aria-hidden="true" />}
          {status === "live" ? t.live : status === "connecting" ? t.connecting : t.reconnecting}
        </span>
        <span className="text-ink-soft">{t.noDm}</span>
      </div>

      <div ref={listRef} onScroll={onScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {hasOlder && (
          <div className="text-center">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="rounded-full border border-border-c px-4 py-1.5 text-xs font-semibold text-ink-soft hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
              {loadingOlder ? dict.lounge.common.loading : t.loadOlder}
            </button>
          </div>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-ink-soft">{t.empty}</p>}
        {messages.map((m) => {
          const a = authorOf(m, authorsRef.current);
          const own = m.author_id === viewerId;
          const quoted = m.reply_to_id ? byId.get(m.reply_to_id) : null;
          return (
            <div key={m.id} className={cn("flex gap-2.5", own && "flex-row-reverse")}>
              <Link href={memberHref(a.user_id)} className="shrink-0 self-end">
                <Avatar name={a.display_name} src={a.avatar_url} size="xs" />
              </Link>
              <div className={cn("group max-w-[82%] sm:max-w-[70%]", own && "text-end")}>
                <div className={cn("mb-0.5 flex items-baseline gap-2 text-[11px] text-ink-soft", own && "flex-row-reverse")}>
                  <Link href={memberHref(a.user_id)} className="font-bold text-foreground hover:text-blue-600">
                    {own ? dict.lounge.profile.you : a.display_name}
                  </Link>
                  <VerifiedBadge verified={a.is_verified} label={a.badge_label} size="xs" />
                  <time dateTime={m.created_at}>{timeAgo(m.created_at, dict.lounge.common, lang)}</time>
                </div>
                <div className={cn("space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", own ? "rounded-ee-md bg-blue-500 text-white" : "rounded-es-md bg-surface-alt")}>
                  {quoted && (
                    <div className={cn("border-s-2 ps-2 text-xs opacity-80", own ? "border-white/60" : "border-blue-400")}>
                      <span className="font-semibold">{authorOf(quoted, authorsRef.current).display_name}: </span>
                      <span className="line-clamp-2">{previewOf(quoted)}</span>
                    </div>
                  )}
                  <Attachment m={m} own={own} />
                  {m.body && <p className="whitespace-pre-line break-words text-start">{m.body}</p>}
                </div>
                <div className={cn("mt-0.5 flex items-center gap-3 px-1 text-[11px] text-ink-soft opacity-0 transition group-hover:opacity-100 focus-within:opacity-100", own && "justify-end")}>
                  <button type="button" onClick={() => setReplyTo(m)} className="inline-flex items-center gap-1 font-semibold hover:text-blue-600">
                    <Reply size={11} aria-hidden="true" /> {dict.lounge.feed.replyTo}
                  </button>
                  {!own && <ReportButton targetType="chat_message" targetId={m.id} compact />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-border-c p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-700">
            <span className="truncate">
              {interpolate(t.replyingTo, { name: authorOf(replyTo, authorsRef.current).display_name })}: {previewOf(replyTo).slice(0, 60)}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label={t.cancelReply} className="ms-2 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {pending && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-border-c bg-surface-alt p-2 pe-3">
            {pending.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaSrc(pending.url) ?? pending.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <FileText size={20} aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1 text-xs" dir="ltr">
              <span className="block truncate font-semibold">{pending.name}</span>
              <span className="text-ink-soft">{formatBytes(pending.size)}</span>
            </span>
            <button type="button" onClick={() => setPending(null)} aria-label={t.removeAttachment} className="rounded-full p-1.5 text-ink-soft hover:bg-surface hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        )}
        {muted ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{t.muted}</p>
        ) : (
          <div className="flex items-end gap-1.5">
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => attach(e.target.files?.[0], "image")} />
            <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => attach(e.target.files?.[0], "file")} />
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading || Boolean(pending)} aria-label={t.attachPhoto} title={t.attachPhoto} className="flex h-[46px] w-[42px] shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-alt hover:text-blue-600 disabled:opacity-40">
              <ImagePlus size={20} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || Boolean(pending)} aria-label={t.attachFile} title={t.attachFile} className="flex h-[46px] w-[42px] shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-alt hover:text-blue-600 disabled:opacity-40">
              <Paperclip size={19} aria-hidden="true" />
            </button>
            <label htmlFor="chat-input" className="sr-only">
              {t.placeholder}
            </label>
            <textarea
              id="chat-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              maxLength={CHAT_MAX_LENGTH}
              placeholder={uploading ? t.attaching : t.placeholder}
              className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-border-c bg-surface-alt px-4 py-3 text-[15px] outline-none focus:border-blue-400"
            />
            <button type="submit" disabled={!canSend} aria-label={t.send} className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-navy-800 disabled:opacity-50">
              <Send size={18} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        )}
        <p className="mt-1 px-1 text-end text-[10px] text-ink-soft">
          {body.length}/{CHAT_MAX_LENGTH}
        </p>
      </form>
    </div>
  );
}

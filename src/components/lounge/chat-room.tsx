"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Reply, X, Wifi, WifiOff } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useToast } from "@/components/toast-provider";
import { Avatar } from "@/components/lounge/avatar";
import { ReportButton } from "@/components/lounge/report-button";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { memberHref, timeAgo } from "@/lib/lounge/utils";
import { CHAT_MAX_LENGTH } from "@/lib/lounge/validation";
import { cn } from "@/lib/utils";
import type { LoungeChatMessageRow } from "@/lib/supabase/lounge.types";

type AuthorInfo = { user_id: string; display_name: string; avatar_url: string | null; is_verified?: boolean; badge_label?: string | null };
export interface ChatMessage extends LoungeChatMessageRow {
  author: AuthorInfo | AuthorInfo[] | null;
}

type Status = "connecting" | "live" | "reconnecting";

function authorOf(m: ChatMessage, cache: Map<string, AuthorInfo>): AuthorInfo {
  const a = Array.isArray(m.author) ? m.author[0] : m.author;
  return a ?? cache.get(m.author_id) ?? { user_id: m.author_id, display_name: "Member", avatar_url: null };
}

export function ChatRoom({ initialMessages, viewerId, muted }: { initialMessages: ChatMessage[]; viewerId: string; muted: boolean }) {
  const { dict, lang } = useLanguage();
  const t = dict.lounge.chat;
  const { showToast } = useToast();

  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = React.useState<Status>("connecting");
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<ChatMessage | null>(null);
  const [sending, setSending] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasOlder, setHasOlder] = React.useState(initialMessages.length >= 50);
  const listRef = React.useRef<HTMLDivElement>(null);
  const authorsRef = React.useRef(new Map<string, AuthorInfo>());
  const stickToBottom = React.useRef(true);

  // Remember every author we've seen so realtime inserts (which carry only
  // the raw row) can be rendered without a lookup.
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
      // Anything that arrived while the socket was down.
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
    // Subscribe once; gap-fill reads the latest messages via a ref-like closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    if (text.length > CHAT_MAX_LENGTH) {
      showToast("error", interpolate(t.tooLong, { n: CHAT_MAX_LENGTH }));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/lounge/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, replyToId: replyTo?.id ?? null }),
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
                <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed", own ? "rounded-ee-md bg-blue-500 text-white" : "rounded-es-md bg-surface-alt")}>
                  {quoted && (
                    <div className={cn("mb-1.5 border-s-2 ps-2 text-xs opacity-80", own ? "border-white/60" : "border-blue-400")}>
                      <span className="font-semibold">{authorOf(quoted, authorsRef.current).display_name}: </span>
                      <span className="line-clamp-2">{quoted.body}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line break-words text-start">{m.body}</p>
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
            <span className="truncate">{interpolate(t.replyingTo, { name: authorOf(replyTo, authorsRef.current).display_name })}: {replyTo.body.slice(0, 60)}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label={t.cancelReply} className="ms-2 shrink-0">
              <X size={13} />
            </button>
          </div>
        )}
        {muted ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{t.muted}</p>
        ) : (
          <div className="flex items-end gap-2">
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
              placeholder={t.placeholder}
              className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-border-c bg-surface-alt px-4 py-3 text-[15px] outline-none focus:border-blue-400"
            />
            <button type="submit" disabled={sending || !body.trim()} aria-label={t.send} className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-navy-800 disabled:opacity-50">
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

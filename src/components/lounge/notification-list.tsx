"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Trophy, Megaphone, ShieldCheck, Reply, Medal } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { timeAgo } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";
import type { LoungeNotificationRow } from "@/lib/supabase/lounge.types";

const ICONS: Record<string, typeof Bell> = {
  like: Heart,
  comment: MessageCircle,
  reply: Reply,
  follow: UserPlus,
  achievement: Trophy,
  award: Medal,
  helpful: ShieldCheck,
  announcement: Megaphone,
};

function iconFor(type: string) {
  if (type.startsWith("membership.")) return ShieldCheck;
  if (type.startsWith("challenge")) return Medal;
  return ICONS[type] ?? Bell;
}

export function NotificationList({ initial }: { initial: LoungeNotificationRow[] }) {
  const router = useRouter();
  const { dict, lang } = useLanguage();
  const t = dict.lounge.notifications;
  const [items, setItems] = React.useState(initial);
  const unread = items.filter((n) => !n.is_read).length;

  async function markRead(ids?: string[]) {
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await fetch("/api/lounge/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { ids } : {}) });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">
          {unread} {t.unread}
        </p>
        {unread > 0 && (
          <button type="button" onClick={() => markRead()} className="inline-flex items-center gap-1.5 rounded-full border border-border-c bg-surface px-4 py-2 text-xs font-semibold transition hover:border-blue-400 hover:text-blue-600">
            <CheckCheck size={14} aria-hidden="true" /> {t.markAllRead}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border-c bg-surface">
          {items.map((n) => {
            const Icon = iconFor(n.type);
            const inner = (
              <>
                <span className={cn("mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full", n.is_read ? "bg-surface-alt text-ink-soft" : "bg-blue-100 text-blue-600")}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.is_read && "font-bold")}>{n.title}</span>
                  {n.body && <span className="block truncate text-sm text-ink-soft">{n.body}</span>}
                  <time dateTime={n.created_at} className="block text-xs text-ink-soft">
                    {timeAgo(n.created_at, dict.lounge.common, lang)}
                  </time>
                </span>
                {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />}
              </>
            );
            const cls = cn("flex gap-3 border-b border-border-c px-4 py-3.5 transition last:border-0 hover:bg-surface-alt", !n.is_read && "bg-blue-050");
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} onClick={() => !n.is_read && markRead([n.id])} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" onClick={() => !n.is_read && markRead([n.id])} className={cn(cls, "w-full text-start")} aria-label={t.markRead}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

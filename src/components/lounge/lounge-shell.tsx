"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, MessagesSquare, Swords, Bell, UserCircle2, Users, Bookmark, Settings, PenSquare } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/lounge/avatar";

interface Props {
  isApproved: boolean;
  unreadCount: number;
  displayName: string | null;
  avatarUrl: string | null;
  children: React.ReactNode;
}

/** App frame for approved members: a sticky sidebar on desktop and a
 *  bottom tab bar on phones, both under the normal site header so the
 *  Lounge still feels like part of reemora.app. Guests and pending
 *  applicants get the plain page without navigation. */
export function LoungeShell({ isApproved, unreadCount, displayName, avatarUrl, children }: Props) {
  const pathname = usePathname();
  const { dict } = useLanguage();
  const t = dict.lounge.nav;

  if (!isApproved) {
    return <div className="mx-auto max-w-[1180px] px-5 pb-20 pt-[96px] sm:px-6 sm:pt-[110px]">{children}</div>;
  }

  type NavLink = { href: string; label: string; icon: typeof Newspaper; exact?: boolean; badge?: number };
  const primary: NavLink[] = [
    { href: "/lounge", label: t.feed, icon: Newspaper, exact: true },
    { href: "/lounge/chat", label: t.chat, icon: MessagesSquare },
    { href: "/lounge/challenges", label: t.challenges, icon: Swords },
    { href: "/lounge/notifications", label: t.notifications, icon: Bell, badge: unreadCount },
    { href: "/lounge/me", label: t.profile, icon: UserCircle2 },
  ];
  const secondary: NavLink[] = [
    { href: "/lounge/members", label: t.members, icon: Users },
    { href: "/lounge/bookmarks", label: t.bookmarks, icon: Bookmark },
    { href: "/lounge/settings", label: t.settings, icon: Settings },
  ];

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-[84px] sm:px-6 sm:pt-[100px] md:pb-16">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] lg:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-[96px] rounded-2xl border border-border-c bg-surface p-3">
            <Link href="/lounge/me" className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-alt">
              <Avatar name={displayName ?? "?"} src={avatarUrl} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{displayName}</span>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-blue-600">{dict.lounge.name}</span>
              </span>
            </Link>
            <nav aria-label={dict.lounge.name} className="flex flex-col gap-0.5">
              {[...primary, ...secondary].map((link) => {
                const active = isActive(link.href, link.exact);
                const badge = link.badge ?? 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active ? "bg-blue-100 text-blue-600" : "text-foreground hover:bg-surface-alt"
                    )}
                  >
                    <link.icon size={17} aria-hidden="true" />
                    <span className="flex-1">{link.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{badge > 99 ? "99+" : badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <Link
              href="/lounge/new"
              className="mt-3 flex items-center justify-center gap-2 rounded-full border-2 border-transparent bg-blue-500 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              <PenSquare size={15} aria-hidden="true" /> {t.newPost}
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Phone-only quick links to pages that don't fit the tab bar. */}
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none]">
            {secondary.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                  isActive(link.href) ? "border-blue-400 bg-blue-100 text-blue-600" : "border-border-c bg-surface text-foreground"
                )}
              >
                <link.icon size={13} aria-hidden="true" /> {link.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>

      <nav
        aria-label={dict.lounge.name}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-c bg-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {primary.map((link) => {
            const active = isActive(link.href, link.exact);
            const badge = link.badge ?? 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold", active ? "text-blue-600" : "text-ink-soft")}
              >
                <link.icon size={20} aria-hidden="true" />
                {link.label}
                {badge ? (
                  <span className="absolute top-1.5 ms-5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">{badge > 99 ? "99+" : badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { PostCard } from "@/components/lounge/post-card";
import { Avatar } from "@/components/lounge/avatar";
import { VerifiedBadge } from "@/components/lounge/verified-badge";
import { memberHref } from "@/lib/lounge/utils";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/lounge/feed";

const FILTERS = ["recent", "projects", "questions", "popular", "following"] as const;

export interface Builder {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
}

export function Feed({
  initialPosts,
  initialCursor,
  filter,
  viewerId,
  isAdmin,
  builders = [],
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  filter: string;
  viewerId: string;
  isAdmin: boolean;
  builders?: Builder[];
}) {
  const { dict } = useLanguage();
  const t = dict.lounge.feed;
  const [posts, setPosts] = React.useState(initialPosts);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
  }, [initialPosts, initialCursor]);

  const labels: Record<(typeof FILTERS)[number], string> = {
    recent: t.filterAll,
    projects: t.filterProjects,
    questions: t.filterQuestions,
    popular: t.filterPopular,
    following: t.filterFollowing,
  };

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lounge/posts?filter=${encodeURIComponent(filter)}&cursor=${encodeURIComponent(cursor)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...(data.posts as FeedPost[]).filter((p) => !seen.has(p.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      /* keep what we have; the button stays available */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px]">
      {/* Who posted lately: a stories-style strip, starting with "new post". */}
      <div className="-mx-4 mb-4 flex gap-3.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-1 [scrollbar-width:none]" aria-label={t.latestBuilders}>
        <Link href="/lounge/new" className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center">
          <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-dashed border-blue-400 bg-blue-050 text-blue-600 transition hover:bg-blue-100">
            <Plus size={24} aria-hidden="true" />
          </span>
          <span className="line-clamp-1 text-[11px] font-semibold text-blue-600">{dict.lounge.nav.newPost}</span>
        </Link>
        {builders.map((b) => (
          <Link key={b.user_id} href={memberHref(b.user_id)} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="rounded-full bg-gradient-to-tr from-navy-800 via-blue-500 to-blue-400 p-[2.5px]">
              <span className="block rounded-full bg-surface p-[2px]">
                <Avatar name={b.display_name} src={b.avatar_url} size="md" />
              </span>
            </span>
            <span className="flex max-w-full items-center gap-0.5">
              <span className="truncate text-[11px] font-semibold">{b.display_name.split(" ")[0]}</span>
              <VerifiedBadge verified={b.is_verified} size="xs" />
            </span>
          </Link>
        ))}
      </div>

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "recent" ? "/lounge" : `/lounge?filter=${f}`}
            scroll={false}
            className={cn("shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition", filter === f ? "border-navy-800 bg-navy-800 text-white" : "border-border-c bg-surface text-foreground hover:border-blue-400")}
          >
            {labels[f]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewerId={viewerId} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {cursor && (
        <div className="mt-6 text-center">
          <button type="button" onClick={loadMore} disabled={loading} className="rounded-full border border-border-c bg-surface px-6 py-2.5 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-60">
            {loading ? t.loading : t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}

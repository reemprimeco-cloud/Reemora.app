"use client";

import * as React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { PostCard } from "@/components/lounge/post-card";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/lib/lounge/feed";

const FILTERS = ["recent", "projects", "questions", "popular", "following"] as const;

export function Feed({ initialPosts, initialCursor, filter, viewerId, isAdmin }: { initialPosts: FeedPost[]; initialCursor: string | null; filter: string; viewerId: string; isAdmin: boolean }) {
  const { dict } = useLanguage();
  const t = dict.lounge.feed;
  const [posts, setPosts] = React.useState(initialPosts);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);

  // A new filter arrives as fresh server props; resync.
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
    <div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "recent" ? "/lounge" : `/lounge?filter=${f}`}
            scroll={false}
            className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition", filter === f ? "border-blue-400 bg-blue-100 text-blue-600" : "border-border-c bg-surface text-foreground hover:border-blue-400")}
          >
            {labels[f]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-ink-soft">{t.empty}</p>
      ) : (
        <div className="space-y-4">
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

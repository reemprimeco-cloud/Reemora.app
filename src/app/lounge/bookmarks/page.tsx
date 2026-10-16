import type { Metadata } from "next";
import { requireApprovedPage } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { loadBookmarkedPosts } from "@/lib/lounge/feed";
import { PostCard } from "@/components/lounge/post-card";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Saved" };

export default async function BookmarksPage() {
  const viewer = await requireApprovedPage("/lounge/bookmarks");
  const lang = await getLang();
  const dict = getDict(lang).lounge;
  const posts = await loadBookmarkedPosts(viewer.user!.id);
  return (
    <div>
      <PageHeader title={dict.nav.bookmarks} />
      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-c bg-surface p-10 text-center text-ink-soft">{dict.feed.empty}</p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} viewerId={viewer.user!.id} isAdmin={viewer.isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}

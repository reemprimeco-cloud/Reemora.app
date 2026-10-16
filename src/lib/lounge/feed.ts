import { createClient } from "@/lib/supabase/server";
import type { Db } from "@/lib/lounge/api";
import type { LoungePostRow, LoungeBadgeCode } from "@/lib/supabase/lounge.types";
import type { AwardBadge } from "@/components/lounge/award-badge";

export interface FeedAuthor {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_verified: boolean;
  badge_label: string | null;
  badges: AwardBadge[];
}

export interface FeedPost extends LoungePostRow {
  author: FeedAuthor;
  liked: boolean;
  bookmarked: boolean;
}

export const FEED_PAGE_SIZE = 10;
export const FEED_FILTERS = ["recent", "projects", "questions", "popular", "following"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

const POST_SELECT = "*, author:lounge_members!lounge_posts_author_id_fkey(user_id, display_name, avatar_url, is_verified, badge_label)";

type RawAuthor = { user_id: string; display_name: string; avatar_url: string | null; is_verified?: boolean; badge_label?: string | null };
type RawPost = LoungePostRow & { author: RawAuthor | RawAuthor[] | null };

/** Attaches the viewer's like/bookmark state and authors' badges. */
export async function decoratePosts(supabase: Db, raw: RawPost[], viewerId: string): Promise<FeedPost[]> {
  if (!raw.length) return [];
  const postIds = raw.map((p) => p.id);
  const authorIds = Array.from(new Set(raw.map((p) => p.author_id)));

  const [{ data: likes }, { data: bookmarks }, { data: awards }] = await Promise.all([
    supabase.from("lounge_post_likes").select("post_id").eq("user_id", viewerId).in("post_id", postIds),
    supabase.from("lounge_bookmarks").select("post_id").eq("user_id", viewerId).in("post_id", postIds),
    supabase.from("lounge_challenge_awards").select("member_id, badge_code").in("member_id", authorIds),
  ]);

  const liked = new Set((likes ?? []).map((l) => l.post_id));
  const bookmarked = new Set((bookmarks ?? []).map((b) => b.post_id));
  const badges = new Map<string, AwardBadge[]>();
  for (const a of awards ?? []) {
    const list = badges.get(a.member_id) ?? [];
    list.push({ code: a.badge_code as LoungeBadgeCode });
    badges.set(a.member_id, list);
  }

  return raw.map((p) => {
    const a = Array.isArray(p.author) ? p.author[0] : p.author;
    return {
      ...p,
      author: {
        user_id: a?.user_id ?? p.author_id,
        display_name: a?.display_name ?? "Member",
        avatar_url: a?.avatar_url ?? null,
        is_verified: Boolean(a?.is_verified),
        badge_label: a?.badge_label ?? null,
        badges: badges.get(p.author_id) ?? [],
      },
      liked: liked.has(p.id),
      bookmarked: bookmarked.has(p.id),
    };
  });
}

/** One page of the feed. Offset-based so "popular" (sorted by likes) and
 *  "recent" share the same cursor shape; pages are small and RLS already
 *  hides anything the viewer shouldn't see. */
export async function loadFeedPage(opts: { filter: string; viewerId: string; cursor?: string | null; supabase?: Db }): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const supabase = opts.supabase ?? (await createClient());
  const filter: FeedFilter = (FEED_FILTERS as readonly string[]).includes(opts.filter) ? (opts.filter as FeedFilter) : "recent";
  const offset = Math.max(0, Number.parseInt(opts.cursor ?? "0", 10) || 0);

  let query = supabase.from("lounge_posts").select(POST_SELECT).eq("is_hidden", false);

  if (filter === "projects") query = query.eq("type", "project");
  if (filter === "questions") query = query.eq("type", "question");
  if (filter === "following") {
    const { data: follows } = await supabase.from("lounge_follows").select("following_id").eq("follower_id", opts.viewerId);
    const ids = (follows ?? []).map((f) => f.following_id);
    if (!ids.length) return { posts: [], nextCursor: null };
    query = query.in("author_id", ids);
  }

  query =
    filter === "popular"
      ? query.order("like_count", { ascending: false }).order("comment_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data, error } = await query.range(offset, offset + FEED_PAGE_SIZE);
  if (error) {
    console.error("loadFeedPage:", error.message);
    return { posts: [], nextCursor: null };
  }

  const rows = (data ?? []) as unknown as RawPost[];
  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;
  const posts = await decoratePosts(supabase, page, opts.viewerId);
  return { posts, nextCursor: hasMore ? String(offset + FEED_PAGE_SIZE) : null };
}

export async function loadPostsByAuthor(authorId: string, viewerId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("lounge_posts").select(POST_SELECT).eq("author_id", authorId).order("created_at", { ascending: false }).limit(50);
  return decoratePosts(supabase, (data ?? []) as unknown as RawPost[], viewerId);
}

export async function loadPost(postId: string, viewerId: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("lounge_posts").select(POST_SELECT).eq("id", postId).maybeSingle();
  if (!data) return null;
  const [post] = await decoratePosts(supabase, [data as unknown as RawPost], viewerId);
  return post ?? null;
}

export async function loadBookmarkedPosts(viewerId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data: marks } = await supabase.from("lounge_bookmarks").select("post_id, created_at").eq("user_id", viewerId).order("created_at", { ascending: false }).limit(100);
  const ids = (marks ?? []).map((m) => m.post_id);
  if (!ids.length) return [];
  const { data } = await supabase.from("lounge_posts").select(POST_SELECT).in("id", ids);
  const byId = new Map(((data ?? []) as unknown as RawPost[]).map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is RawPost => Boolean(p));
  return decoratePosts(supabase, ordered, viewerId);
}

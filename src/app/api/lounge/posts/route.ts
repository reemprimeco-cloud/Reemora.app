import { NextResponse } from "next/server";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { postSchema } from "@/lib/lounge/validation";
import { loadFeedPage } from "@/lib/lounge/feed";
import { evaluateAchievements } from "@/lib/lounge/achievements";

/** GET — next page of the feed (same shape the server-rendered page uses). */
export async function GET(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const url = new URL(request.url);
  const page = await loadFeedPage({
    filter: url.searchParams.get("filter") ?? "recent",
    cursor: url.searchParams.get("cursor"),
    viewerId: ctx.user.id,
    supabase: ctx.supabase,
  });
  return NextResponse.json(page);
}

/** POST — publish a post. Inserted with the member's own session, so RLS
 *  guarantees author_id is the caller and that they're approved; the DB
 *  trigger caps it at 10 posts/hour. */
export async function POST(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;

  const parsed = await parseBody(request, postSchema);
  if (parsed instanceof NextResponse) return parsed;

  const ownPrefix = `/storage/v1/object/public/lounge-media/${ctx.user.id}/`;
  const images = [parsed.imageUrl, ...parsed.galleryUrls].filter((u): u is string => Boolean(u));
  if (images.some((u) => !u.includes(ownPrefix))) {
    return jsonError("Images must be uploaded through the Lounge.", 400, { imageUrl: "invalid" });
  }

  const { data, error } = await ctx.supabase
    .from("lounge_posts")
    .insert({
      author_id: ctx.user.id,
      type: parsed.type,
      title: parsed.title,
      body: parsed.body,
      project_url: parsed.type === "project" || parsed.type === "tool" ? parsed.projectUrl ?? null : null,
      project_category: parsed.type === "project" ? parsed.projectCategory ?? null : null,
      project_status: parsed.type === "project" ? parsed.projectStatus ?? null : null,
      tools: parsed.tools ?? [],
      image_url: parsed.imageUrl ?? null,
      gallery_urls: parsed.galleryUrls,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("rate_limited")) return jsonError("You're posting too quickly. Try again in a bit.", 429);
    console.error("lounge post insert:", error.message);
    return jsonError("Could not publish your post.", 400);
  }

  await evaluateAchievements(ctx.user.id);
  return NextResponse.json({ ok: true, id: data.id });
}

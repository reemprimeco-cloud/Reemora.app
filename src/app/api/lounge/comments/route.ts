import { NextResponse } from "next/server";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { commentSchema } from "@/lib/lounge/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notify } from "@/lib/lounge/notify";
import { evaluateAchievements } from "@/lib/lounge/achievements";

/** Add a comment or a reply. */
export async function POST(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, commentSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: post } = await ctx.supabase.from("lounge_posts").select("id, author_id, title, type").eq("id", parsed.postId).maybeSingle();
  if (!post) return jsonError("Post not found.", 404);

  let parentAuthor: string | null = null;
  if (parsed.parentId) {
    const { data: parent } = await ctx.supabase.from("lounge_comments").select("id, author_id, post_id, parent_id").eq("id", parsed.parentId).maybeSingle();
    if (!parent || parent.post_id !== post.id) return jsonError("Reply target not found.", 404);
    parentAuthor = parent.author_id;
    // Keep threads one level deep: a reply to a reply attaches to the root.
    if (parent.parent_id) parsed.parentId = parent.parent_id;
  }

  const { data, error } = await ctx.supabase
    .from("lounge_comments")
    .insert({
      post_id: post.id,
      author_id: ctx.user.id,
      parent_id: parsed.parentId ?? null,
      body: parsed.body,
      // Structured feedback lives on project posts; replies follow their root.
      category: post.type === "project" && !parsed.parentId ? (parsed.category ?? null) : null,
    })
    .select("*, author:lounge_members!lounge_comments_author_id_fkey(user_id, display_name, avatar_url, is_verified, badge_label)")
    .single();

  if (error) {
    if (error.message.includes("rate_limited")) return jsonError("You're commenting too quickly. Try again in a bit.", 429);
    return jsonError("Could not post your comment.", 400);
  }

  const service = await createServiceRoleClient();
  const url = `/lounge/posts/${post.id}#comment-${data.id}`;
  const snippet = parsed.body.length > 90 ? parsed.body.slice(0, 90) + "…" : parsed.body;

  if (parentAuthor && parentAuthor !== ctx.user.id) {
    await notify(service, {
      userId: parentAuthor,
      type: "reply",
      title: `${ctx.member.display_name} replied to your comment`,
      body: snippet,
      url,
      actorId: ctx.user.id,
      dedupeKey: `comment:${data.id}:reply`,
    });
  }
  if (post.author_id !== ctx.user.id && post.author_id !== parentAuthor) {
    await notify(service, {
      userId: post.author_id,
      type: "comment",
      title: `${ctx.member.display_name} commented on "${post.title}"`,
      body: snippet,
      url,
      actorId: ctx.user.id,
      dedupeKey: `comment:${data.id}:post`,
    });
  }

  // The post's author may have just "started a discussion"; the commenter
  // may be climbing toward Community Contributor.
  await Promise.all([evaluateAchievements(post.author_id), evaluateAchievements(ctx.user.id)]);

  return NextResponse.json({ ok: true, comment: data });
}

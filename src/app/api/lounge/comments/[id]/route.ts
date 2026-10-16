import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError, logAudit } from "@/lib/lounge/api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notify } from "@/lib/lounge/notify";
import { evaluateAchievements } from "@/lib/lounge/achievements";

type Params = { params: Promise<{ id: string }> };
const helpfulSchema = z.object({ helpful: z.boolean() });

/** PATCH { helpful } — only the post's author (or an admin) can mark a
 *  comment as helpful. Members can't grant it to themselves: is_helpful is
 *  outside the member column grant, so this write uses the service role
 *  after the ownership check below. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid comment id.", 400);
  const parsed = await parseBody(request, helpfulSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: comment } = await ctx.supabase
    .from("lounge_comments")
    .select("id, author_id, post_id, is_helpful, post:lounge_posts!lounge_comments_post_id_fkey(author_id, title)")
    .eq("id", id)
    .maybeSingle();
  if (!comment) return jsonError("Comment not found.", 404);

  const post = Array.isArray(comment.post) ? comment.post[0] : comment.post;
  const { data: me } = await ctx.supabase.from("users").select("role").eq("id", ctx.user.id).maybeSingle();
  const isAdmin = me?.role === "admin";
  if (post?.author_id !== ctx.user.id && !isAdmin) return jsonError("Only the post's author can mark answers as helpful.", 403);
  if (comment.author_id === ctx.user.id) return jsonError("You can't mark your own comment as helpful.", 400);

  const service = await createServiceRoleClient();
  const { error } = await service.from("lounge_comments").update({ is_helpful: parsed.helpful }).eq("id", id);
  if (error) return jsonError("Could not update this comment.", 500);

  if (parsed.helpful && !comment.is_helpful) {
    await notify(service, {
      userId: comment.author_id,
      type: "helpful",
      title: `Your answer on "${post?.title ?? "a post"}" was marked helpful`,
      url: `/lounge/posts/${comment.post_id}#comment-${id}`,
      actorId: ctx.user.id,
      dedupeKey: `helpful:${id}`,
    });
    await evaluateAchievements(comment.author_id);
  }
  if (isAdmin && post?.author_id !== ctx.user.id) {
    await logAudit(service, { actorId: ctx.user.id, action: parsed.helpful ? "comment.helpful" : "comment.unhelpful", targetType: "comment", targetId: id });
  }
  return NextResponse.json({ ok: true, helpful: parsed.helpful });
}

/** DELETE — the comment's author or an admin. */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid comment id.", 400);

  const { data: comment } = await ctx.supabase.from("lounge_comments").select("id, author_id").eq("id", id).maybeSingle();
  if (!comment) return jsonError("Comment not found.", 404);

  const { error } = await ctx.supabase.from("lounge_comments").delete().eq("id", id);
  if (error) return jsonError("Could not delete this comment.", 403);

  if (comment.author_id !== ctx.user.id) {
    const service = await createServiceRoleClient();
    await logAudit(service, { actorId: ctx.user.id, action: "comment.delete", targetType: "comment", targetId: id, details: { author_id: comment.author_id } });
  }
  return NextResponse.json({ ok: true });
}

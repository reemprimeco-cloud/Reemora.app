import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notify } from "@/lib/lounge/notify";
import { evaluateAchievements } from "@/lib/lounge/achievements";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ on: z.boolean() });

/** Like / unlike. The (post_id, user_id) primary key makes a repeated like
 *  idempotent; the counter lives in a trigger, never in the request. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid post id.", 400);
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  if (parsed.on) {
    const { error } = await ctx.supabase.from("lounge_post_likes").upsert({ post_id: id, user_id: ctx.user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
    if (error) return jsonError("Could not like this post.", 400);
  } else {
    const { error } = await ctx.supabase.from("lounge_post_likes").delete().match({ post_id: id, user_id: ctx.user.id });
    if (error) return jsonError("Could not unlike this post.", 400);
  }

  const { data: post } = await ctx.supabase.from("lounge_posts").select("author_id, title, type, like_count").eq("id", id).maybeSingle();
  if (!post) return jsonError("Post not found.", 404);

  if (parsed.on && post.author_id !== ctx.user.id) {
    const service = await createServiceRoleClient();
    await notify(service, {
      userId: post.author_id,
      type: "like",
      title: `${ctx.member.display_name} liked your ${post.type === "project" ? "project" : "post"}`,
      body: post.title,
      url: `/lounge/posts/${id}`,
      actorId: ctx.user.id,
      dedupeKey: `like:${id}:${ctx.user.id}`,
      push: false,
    });
    await evaluateAchievements(post.author_id);
  }

  return NextResponse.json({ ok: true, liked: parsed.on, likeCount: post.like_count });
}

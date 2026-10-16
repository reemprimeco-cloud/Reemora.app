import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError, logAudit } from "@/lib/lounge/api";
import { postSchema } from "@/lib/lounge/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

/** PATCH — author edits their own post. RLS limits the update to the
 *  author's rows and the column grant to content fields. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Invalid post id.", 400);

  const parsed = await parseBody(request, postSchema);
  if (parsed instanceof NextResponse) return parsed;

  const ownPrefix = `/storage/v1/object/public/lounge-media/${ctx.user.id}/`;
  const images = [parsed.imageUrl, ...parsed.galleryUrls].filter((u): u is string => Boolean(u));
  if (images.some((u) => !u.includes(ownPrefix))) {
    return jsonError("Images must be uploaded through the Lounge.", 400, { imageUrl: "invalid" });
  }

  const { data, error } = await ctx.supabase
    .from("lounge_posts")
    .update({
      title: parsed.title,
      body: parsed.body,
      project_url: parsed.type === "project" || parsed.type === "tool" ? parsed.projectUrl ?? null : null,
      project_category: parsed.type === "project" ? parsed.projectCategory ?? null : null,
      project_status: parsed.type === "project" ? parsed.projectStatus ?? null : null,
      tools: parsed.tools ?? [],
      image_url: parsed.imageUrl ?? null,
      gallery_urls: parsed.galleryUrls,
    })
    .eq("id", id)
    .eq("author_id", ctx.user.id)
    .select("id")
    .maybeSingle();

  if (error) return jsonError("Could not save your changes.", 400);
  if (!data) return jsonError("Post not found.", 404);
  return NextResponse.json({ ok: true, id: data.id });
}

/** DELETE — author or admin. Admin deletions are audited. */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return jsonError("Invalid post id.", 400);

  const { data: post } = await ctx.supabase.from("lounge_posts").select("id, author_id, title").eq("id", id).maybeSingle();
  if (!post) return jsonError("Post not found.", 404);

  const { error } = await ctx.supabase.from("lounge_posts").delete().eq("id", id);
  if (error) return jsonError("Could not delete this post.", 403);

  if (post.author_id !== ctx.user.id) {
    const service = await createServiceRoleClient();
    await logAudit(service, { actorId: ctx.user.id, action: "post.delete", targetType: "post", targetId: id, details: { author_id: post.author_id, title: post.title } });
  }
  return NextResponse.json({ ok: true });
}

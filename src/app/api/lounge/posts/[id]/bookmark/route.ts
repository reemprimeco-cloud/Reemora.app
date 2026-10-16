import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ on: z.boolean() });

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid post id.", 400);
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  const { error } = parsed.on
    ? await ctx.supabase.from("lounge_bookmarks").upsert({ user_id: ctx.user.id, post_id: id }, { onConflict: "user_id,post_id", ignoreDuplicates: true })
    : await ctx.supabase.from("lounge_bookmarks").delete().match({ user_id: ctx.user.id, post_id: id });

  if (error) return jsonError("Could not update your bookmarks.", 400);
  return NextResponse.json({ ok: true, bookmarked: parsed.on });
}

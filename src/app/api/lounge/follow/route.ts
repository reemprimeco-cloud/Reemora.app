import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { notify } from "@/lib/lounge/notify";

const schema = z.object({ userId: z.string().uuid(), follow: z.boolean() });

/** Follow / unfollow. The primary key on lounge_follows makes a repeated
 *  follow a no-op, and the insert policy checks the target is an approved
 *  member — so the counters can't be inflated by replaying the request. */
export async function POST(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;

  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;
  if (parsed.userId === ctx.user.id) return jsonError("You can't follow yourself.", 400);

  if (parsed.follow) {
    const { error } = await ctx.supabase
      .from("lounge_follows")
      .upsert({ follower_id: ctx.user.id, following_id: parsed.userId }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
    if (error) return jsonError("Could not follow this member.", 400);

    const service = await createServiceRoleClient();
    await notify(service, {
      userId: parsed.userId,
      type: "follow",
      title: `${ctx.member.display_name} started following you`,
      url: `/lounge/members/${ctx.user.id}`,
      actorId: ctx.user.id,
      dedupeKey: `follow:${ctx.user.id}:${parsed.userId}`,
    });
  } else {
    const { error } = await ctx.supabase.from("lounge_follows").delete().match({ follower_id: ctx.user.id, following_id: parsed.userId });
    if (error) return jsonError("Could not unfollow this member.", 400);
  }

  const { count } = await ctx.supabase
    .from("lounge_follows")
    .select("following_id", { count: "exact", head: true })
    .eq("following_id", parsed.userId);

  return NextResponse.json({ ok: true, following: parsed.follow, followersCount: count ?? 0 });
}

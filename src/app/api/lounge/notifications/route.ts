import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireUser, jsonError } from "@/lib/lounge/api";

const schema = z.object({
  /** Specific ids to mark read, or omit for "all". */
  ids: z.array(z.string().uuid()).max(200).optional(),
});

/** Mark notifications as read. Runs with the member's own session: RLS
 *  limits it to their rows and the column grant to is_read. */
export async function PATCH(request: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  let query = ctx.supabase.from("lounge_notifications").update({ is_read: true }).eq("user_id", ctx.user.id).eq("is_read", false);
  if (parsed.ids?.length) query = query.in("id", parsed.ids);
  const { error } = await query;
  if (error) return jsonError("Could not update notifications.", 500);

  const { count } = await ctx.supabase.from("lounge_notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id).eq("is_read", false);
  return NextResponse.json({ ok: true, unreadCount: count ?? 0 });
}

/** Unread count for badge refreshes. */
export async function GET() {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const { count } = await ctx.supabase.from("lounge_notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id).eq("is_read", false);
  return NextResponse.json({ unreadCount: count ?? 0 });
}

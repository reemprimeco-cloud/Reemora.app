import { NextResponse } from "next/server";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { chatSchema } from "@/lib/lounge/validation";

const CHAT_PAGE = 50;
const MESSAGE_SELECT = "id, author_id, body, reply_to_id, is_hidden, attachment_url, attachment_type, attachment_name, attachment_size, created_at, author:lounge_members!lounge_chat_messages_author_id_fkey(user_id, display_name, avatar_url, is_verified, badge_label)";

/** GET ?before=<iso> — older messages for infinite scroll.
 *  GET ?after=<iso>  — anything newer than the last message the client
 *  has (gap fill after a dropped Realtime connection). Both return
 *  chronological order. */
export async function GET(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const params = new URL(request.url).searchParams;
  const before = params.get("before");
  const after = params.get("after");

  if (after && !Number.isNaN(Date.parse(after))) {
    const { data, error } = await ctx.supabase.from("lounge_chat_messages").select(MESSAGE_SELECT).gt("created_at", after).order("created_at", { ascending: true }).limit(CHAT_PAGE);
    if (error) return jsonError("Could not load messages.", 500);
    return NextResponse.json({ messages: data ?? [] });
  }

  let query = ctx.supabase.from("lounge_chat_messages").select(MESSAGE_SELECT).order("created_at", { ascending: false }).limit(CHAT_PAGE);
  if (before && !Number.isNaN(Date.parse(before))) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) return jsonError("Could not load messages.", 500);
  return NextResponse.json({ messages: (data ?? []).reverse() });
}

/** POST — send to the room. Rate limit (5 per 10s) and mute are enforced
 *  by database triggers; this just translates them into friendly errors. */
export async function POST(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, chatSchema);
  if (parsed instanceof NextResponse) return parsed;

  // Attachments must come from the caller's own folder in the Lounge files
  // bucket; anything else is rejected before it can become an <a href>.
  const att = parsed.attachment ?? null;
  if (att && !att.url.includes(`/storage/v1/object/public/lounge-files/${ctx.user.id}/`)) {
    return jsonError("Attachments must be uploaded through the Lounge.", 400, { attachment: "invalid" });
  }

  const { data, error } = await ctx.supabase
    .from("lounge_chat_messages")
    .insert({
      author_id: ctx.user.id,
      body: parsed.body,
      reply_to_id: parsed.replyToId ?? null,
      attachment_url: att?.url ?? null,
      attachment_type: att?.type ?? null,
      attachment_name: att?.name ?? null,
      attachment_size: att?.size ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (error.message.includes("rate_limited")) return jsonError("rate_limited", 429);
    if (error.message.includes("chat_muted")) return jsonError("chat_muted", 403);
    return jsonError("Could not send your message.", 400);
  }
  return NextResponse.json({ ok: true, message: data });
}

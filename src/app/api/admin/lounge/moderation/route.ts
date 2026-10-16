import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";
import { notify } from "@/lib/lounge/notify";

const schema = z.object({
  targetType: z.enum(["post", "comment", "chat_message", "report"]),
  targetId: z.string().uuid(),
  action: z.enum(["hide", "unhide", "delete", "resolve", "dismiss"]),
  note: z.string().trim().max(300).optional(),
});

const TABLE = { post: "lounge_posts", comment: "lounge_comments", chat_message: "lounge_chat_messages" } as const;

/** PATCH — moderation actions. Hiding keeps the row (and the audit trail)
 *  but removes it from every member view via RLS; delete is permanent. */
export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;
  const { targetType, targetId, action, note } = parsed;

  if (targetType === "report") {
    if (action !== "resolve" && action !== "dismiss") return jsonError("Reports can only be resolved or dismissed.", 400);
    const { error } = await ctx.service
      .from("lounge_reports")
      .update({ status: action === "resolve" ? "resolved" : "dismissed", resolved_by: ctx.user.id, resolved_at: new Date().toISOString(), resolution_note: note || null })
      .eq("id", targetId);
    if (error) return jsonError(error.message, 500);
    await logAudit(ctx.service, { actorId: ctx.user.id, action: `report.${action}`, targetType: "report", targetId, details: { note } });
    return NextResponse.json({ ok: true });
  }

  const table = TABLE[targetType];
  const { data: row } = await ctx.service.from(table).select("id, author_id").eq("id", targetId).maybeSingle();
  if (!row) return jsonError("Content not found.", 404);

  if (action === "delete") {
    const { error } = await ctx.service.from(table).delete().eq("id", targetId);
    if (error) return jsonError(error.message, 500);
  } else if (action === "hide" || action === "unhide") {
    const hidden = action === "hide";
    const { error } =
      targetType === "post"
        ? await ctx.service.from("lounge_posts").update({ is_hidden: hidden, hidden_reason: hidden ? note || null : null }).eq("id", targetId)
        : targetType === "comment"
        ? await ctx.service.from("lounge_comments").update({ is_hidden: hidden }).eq("id", targetId)
        : await ctx.service.from("lounge_chat_messages").update({ is_hidden: hidden }).eq("id", targetId);
    if (error) return jsonError(error.message, 500);
  } else {
    return jsonError("Invalid action for content.", 400);
  }

  await logAudit(ctx.service, { actorId: ctx.user.id, action: `${targetType}.${action}`, targetType, targetId, details: { author_id: row.author_id, note } });

  if (action === "hide" || action === "delete") {
    await notify(ctx.service, {
      userId: row.author_id,
      type: "moderation",
      title: `A ${targetType.replace("_", " ")} of yours was ${action === "hide" ? "hidden" : "removed"} by a moderator`,
      body: note || "It didn't meet the Lounge guidelines.",
      url: "/lounge",
      dedupeKey: `moderation:${targetType}:${targetId}:${action}`,
    });
  }
  return NextResponse.json({ ok: true });
}

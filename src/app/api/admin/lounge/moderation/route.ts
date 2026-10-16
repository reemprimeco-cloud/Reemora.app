import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit, type Db } from "@/lib/lounge/api";
import { notify } from "@/lib/lounge/notify";

const schema = z.object({
  targetType: z.enum(["post", "comment", "chat_message", "report", "member"]),
  targetId: z.string().uuid(),
  action: z.enum(["hide", "unhide", "delete", "resolve", "dismiss", "hide_and_suspend", "suspend"]),
  note: z.string().trim().max(300).optional(),
});


/** One-tap safety action: suspend a member (idempotent), record the
 *  decision in their history, and tell them why. */
async function suspendMember(service: Db, actorId: string, userId: string, note?: string) {
  const { data: member } = await service.from("lounge_members").select("status").eq("user_id", userId).maybeSingle();
  if (!member) return { changed: false };
  if (member.status === "suspended") return { changed: false };
  const now = new Date().toISOString();
  const { error } = await service.from("lounge_members").update({ status: "suspended", decided_at: now, decided_by: actorId, decision_note: note || "Suspended after a moderation report." }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  await service.from("lounge_membership_events").insert({ user_id: userId, action: "suspended", actor_id: actorId, note: note || "Moderation" });
  await notify(service, {
    userId,
    type: "membership.suspended",
    title: "Lounge membership suspended",
    body: note ? `Reason: ${note}` : "Contact the Reemora team for details.",
    url: "/lounge",
    dedupeKey: `membership:${userId}:suspended:${now}`,
  });
  return { changed: true };
}

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

  if (targetType === "member") {
    if (action !== "suspend") return jsonError("Members can only be suspended from here; use Lounge Members for other changes.", 400);
    try {
      const r = await suspendMember(ctx.service, ctx.user.id, targetId, note);
      await logAudit(ctx.service, { actorId: ctx.user.id, action: "member.suspend", targetType: "member", targetId, details: { note, via: "moderation", changed: r.changed } });
      return NextResponse.json({ ok: true, suspended: true });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Could not suspend member.", 500);
    }
  }

  const table = TABLE[targetType];
  const { data: row } = await ctx.service.from(table).select("id, author_id").eq("id", targetId).maybeSingle();
  if (!row) return jsonError("Content not found.", 404);

  if (action === "delete") {
    const { error } = await ctx.service.from(table).delete().eq("id", targetId);
    if (error) return jsonError(error.message, 500);
  } else if (action === "hide" || action === "unhide" || action === "hide_and_suspend") {
    const hidden = action !== "unhide";
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

  if (action === "hide_and_suspend") {
    try {
      await suspendMember(ctx.service, ctx.user.id, row.author_id, note);
      await logAudit(ctx.service, { actorId: ctx.user.id, action: "member.suspend", targetType: "member", targetId: row.author_id, details: { note, via: `${targetType}:${targetId}` } });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Content hidden, but the member could not be suspended.", 500);
    }
  }

  if (action === "hide" || action === "delete" || action === "hide_and_suspend") {
    await notify(ctx.service, {
      userId: row.author_id,
      type: "moderation",
      title: `A ${targetType.replace("_", " ")} of yours was ${action === "delete" ? "removed" : "hidden"} by a moderator`,
      body: note || "It didn't meet the Lounge guidelines.",
      url: "/lounge",
      dedupeKey: `moderation:${targetType}:${targetId}:${action}`,
    });
  }
  return NextResponse.json({ ok: true });
}

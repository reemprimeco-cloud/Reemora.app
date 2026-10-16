import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";
import { notify } from "@/lib/lounge/notify";
import type { LoungeMemberStatus, LoungeMembershipAction } from "@/lib/supabase/lounge.types";

const schema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["approve", "reject", "suspend", "reactivate", "mute", "unmute"]),
  note: z.string().trim().max(500).optional(),
  /** mute only: hours */
  hours: z.number().int().min(1).max(24 * 365).optional(),
});

/** Membership decisions. Only a site admin gets past requireAdmin(); the
 *  transition table below is the single source of truth for which status
 *  changes are legal, every decision is written to the member's history
 *  and the audit log, and the member is notified in-app + by push. */
const TRANSITIONS: Record<string, { from: LoungeMemberStatus[]; to: LoungeMemberStatus; event: LoungeMembershipAction }> = {
  approve: { from: ["pending", "rejected", "suspended"], to: "approved", event: "approved" },
  reject: { from: ["pending"], to: "rejected", event: "rejected" },
  suspend: { from: ["approved"], to: "suspended", event: "suspended" },
  reactivate: { from: ["suspended"], to: "approved", event: "reactivated" },
};

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;
  const { userId, action, note } = parsed;

  const { data: member } = await ctx.service.from("lounge_members").select("*").eq("user_id", userId).maybeSingle();
  if (!member) return jsonError("Member not found.", 404);

  if (action === "mute" || action === "unmute") {
    const until = action === "mute" ? new Date(Date.now() + (parsed.hours ?? 24) * 3600_000).toISOString() : null;
    const { error } = await ctx.service.from("lounge_members").update({ chat_muted_until: until }).eq("user_id", userId);
    if (error) return jsonError(error.message, 500);
    await logAudit(ctx.service, { actorId: ctx.user.id, action: `member.${action}`, targetType: "member", targetId: userId, details: { until, note } });
    return NextResponse.json({ ok: true, chat_muted_until: until });
  }

  const rule = TRANSITIONS[action];
  if (!rule.from.includes(member.status)) {
    return jsonError(`Cannot ${action} a member whose status is "${member.status}".`, 409);
  }

  const now = new Date().toISOString();
  const { error } = await ctx.service
    .from("lounge_members")
    .update({ status: rule.to, decided_at: now, decided_by: ctx.user.id, decision_note: note || null })
    .eq("user_id", userId);
  if (error) return jsonError(error.message, 500);

  await ctx.service.from("lounge_membership_events").insert({ user_id: userId, action: rule.event, actor_id: ctx.user.id, note: note || null });
  await logAudit(ctx.service, { actorId: ctx.user.id, action: `member.${action}`, targetType: "member", targetId: userId, details: { from: member.status, to: rule.to, note } });

  const messages: Record<string, { title: string; body: string }> = {
    approve: { title: "Welcome to the Reemora Lounge 🎉", body: "Your membership has been approved. Come in and say hello." },
    reactivate: { title: "Your Lounge membership is active again", body: "Your access has been restored." },
    reject: { title: "Lounge application update", body: "Your application was not approved this time." },
    suspend: { title: "Lounge membership suspended", body: note ? `Reason: ${note}` : "Contact the Reemora team for details." },
  };
  await notify(ctx.service, {
    userId,
    type: `membership.${rule.event}`,
    title: messages[action].title,
    body: messages[action].body,
    url: "/lounge",
    dedupeKey: `membership:${userId}:${rule.event}:${now}`,
  });

  return NextResponse.json({ ok: true, status: rule.to, decided_at: now });
}

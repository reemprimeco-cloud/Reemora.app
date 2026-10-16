import { NextResponse } from "next/server";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";
import { pointsAdjustSchema } from "@/lib/lounge/validation";
import { notify } from "@/lib/lounge/notify";

/** POST — manual points adjustment by an admin. Lands in the same
 *  append-only ledger as automatic awards (with the admin as actor) and in
 *  the audit log, and the member is told. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, pointsAdjustSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: member } = await ctx.service.from("lounge_members").select("user_id, status").eq("user_id", parsed.userId).maybeSingle();
  if (!member) return jsonError("Member not found.", 404);

  const refId = `${parsed.userId}:${Date.now()}`;
  const { data, error } = await ctx.service
    .from("lounge_points_ledger")
    .insert({ user_id: parsed.userId, delta: parsed.delta, reason: parsed.reason, ref_type: "manual", ref_id: refId, actor_id: ctx.user.id })
    .select("id")
    .single();
  if (error) return jsonError(error.message, 500);

  await logAudit(ctx.service, { actorId: ctx.user.id, action: "points.adjust", targetType: "member", targetId: parsed.userId, details: { delta: parsed.delta, reason: parsed.reason, ledger_id: data.id } });
  await notify(ctx.service, {
    userId: parsed.userId,
    type: "points",
    title: parsed.delta > 0 ? `+${parsed.delta} points from the Reemora team` : `${parsed.delta} points adjustment`,
    body: parsed.reason,
    url: `/lounge/members/${parsed.userId}`,
    dedupeKey: `points:${data.id}`,
  });

  const { data: fresh } = await ctx.service.from("lounge_members").select("points_total").eq("user_id", parsed.userId).maybeSingle();
  return NextResponse.json({ ok: true, pointsTotal: fresh?.points_total ?? null });
}

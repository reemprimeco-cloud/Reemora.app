import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";
import { achievementSchema, pointsRuleSchema } from "@/lib/lounge/validation";

/** POST — create or update an achievement definition (keyed by code). */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, achievementSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data, error } = await ctx.service
    .from("lounge_achievements")
    .upsert(
      {
        code: parsed.code,
        name: parsed.name,
        name_ar: parsed.nameAr,
        description: parsed.description,
        description_ar: parsed.descriptionAr,
        icon: parsed.icon,
        tier: parsed.tier,
        points: parsed.points,
        criteria_type: parsed.criteriaType,
        criteria_threshold: parsed.criteriaThreshold,
        is_active: parsed.isActive,
        sort_order: parsed.sortOrder,
      },
      { onConflict: "code" }
    )
    .select("*")
    .single();
  if (error) return jsonError(error.message, 500);
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "achievement.upsert", targetType: "achievement", targetId: data.id, details: { code: data.code, points: data.points, is_active: data.is_active } });
  return NextResponse.json({ ok: true, achievement: data });
}

/** PATCH — update a points rule. */
export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, pointsRuleSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data, error } = await ctx.service
    .from("lounge_points_rules")
    .update({ points: parsed.points, daily_cap: parsed.dailyCap, is_active: parsed.isActive })
    .eq("key", parsed.key)
    .select("*")
    .maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Rule not found.", 404);
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "points_rule.update", targetType: "points_rule", targetId: parsed.key, details: { points: data.points, daily_cap: data.daily_cap, is_active: data.is_active } });
  return NextResponse.json({ ok: true, rule: data });
}

const revokeSchema = z.object({ memberAchievementId: z.string().uuid(), reason: z.string().trim().min(3).max(300) });

/** DELETE — revoke a suspicious award. The points it paid are reversed
 *  with a new ledger row (the ledger itself is append-only). */
export async function DELETE(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, revokeSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: award } = await ctx.service
    .from("lounge_member_achievements")
    .select("id, user_id, achievement:lounge_achievements!lounge_member_achievements_achievement_id_fkey(code, name, points)")
    .eq("id", parsed.memberAchievementId)
    .maybeSingle();
  if (!award) return jsonError("Award not found.", 404);
  const def = (Array.isArray(award.achievement) ? award.achievement[0] : award.achievement) as { code: string; name: string; points: number } | null;

  const { data: paid } = await ctx.service.from("lounge_points_ledger").select("delta").match({ ref_type: "achievement", ref_id: award.id }).maybeSingle();
  if (paid && paid.delta > 0) {
    await ctx.service.from("lounge_points_ledger").insert({
      user_id: award.user_id,
      delta: -paid.delta,
      reason: `Achievement revoked: ${def?.name ?? ""} — ${parsed.reason}`,
      ref_type: "achievement_revoked",
      ref_id: award.id,
      actor_id: ctx.user.id,
    });
  }
  const { error } = await ctx.service.from("lounge_member_achievements").delete().eq("id", award.id);
  if (error) return jsonError(error.message, 500);
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "achievement.revoke", targetType: "member", targetId: award.user_id, details: { code: def?.code, reason: parsed.reason, points_reversed: paid?.delta ?? 0 } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdmin, jsonError, logAudit } from "@/lib/lounge/api";

/** One click for a site admin to get their own Lounge profile: an
 *  approved, verified membership labelled "Reemora Team". Admin only —
 *  ordinary members can't reach this, and nothing here touches
 *  public.users.role. */
export async function POST() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { data: profile } = await ctx.service.from("users").select("full_name, email").eq("id", ctx.user.id).maybeSingle();
  const displayName = profile?.full_name?.trim() || "Reemora";
  const now = new Date().toISOString();

  const { data: existing } = await ctx.service.from("lounge_members").select("status").eq("user_id", ctx.user.id).maybeSingle();

  const { error } = await ctx.service.from("lounge_members").upsert(
    {
      user_id: ctx.user.id,
      display_name: displayName,
      status: "approved",
      is_verified: true,
      badge_label: "Reemora Team",
      decided_at: now,
      decided_by: ctx.user.id,
      decision_note: "Admin profile",
    },
    { onConflict: "user_id" }
  );
  if (error) return jsonError(error.message, 500);

  if (!existing) {
    await ctx.service.from("lounge_membership_events").insert({ user_id: ctx.user.id, action: "approved", actor_id: ctx.user.id, note: "Admin profile created" });
  }
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "member.admin_profile", targetType: "member", targetId: ctx.user.id, details: { existing: Boolean(existing) } });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";

type Params = { params: Promise<{ id: string }> };

/** POST — finalize results. Everything (ranking, tie-break, badges, points,
 *  notifications) happens inside lounge_finalize_challenge(), which is
 *  idempotent, so an accidental double-click awards nothing twice. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid challenge id.", 400);

  const { data, error } = await ctx.service.rpc("lounge_finalize_challenge", { p_challenge_id: id, p_actor_id: ctx.user.id });
  if (error) {
    if (error.message.includes("not_ready_to_finalize")) return jsonError("Open voting (or close it) before finalizing.", 409);
    return jsonError(error.message, 500);
  }
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "challenge.finalize", targetType: "challenge", targetId: id, details: (data ?? {}) as Record<string, unknown> });
  return NextResponse.json({ ok: true, result: data });
}

const entrySchema = z.object({ entryId: z.string().uuid(), status: z.enum(["approved", "rejected"]), note: z.string().trim().max(300).optional() });

/** PATCH — moderate an entry (approve / reject). */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const parsed = await parseBody(request, entrySchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: entry } = await ctx.service.from("lounge_challenge_entries").select("id, member_id, status, title").match({ id: parsed.entryId, challenge_id: id }).maybeSingle();
  if (!entry) return jsonError("Entry not found.", 404);

  const { error } = await ctx.service.from("lounge_challenge_entries").update({ status: parsed.status }).eq("id", entry.id);
  if (error) return jsonError(error.message, 500);
  await logAudit(ctx.service, { actorId: ctx.user.id, action: `entry.${parsed.status}`, targetType: "challenge_entry", targetId: entry.id, details: { from: entry.status, note: parsed.note } });

  if (parsed.status === "rejected") {
    await ctx.service.from("lounge_notifications").upsert(
      {
        user_id: entry.member_id,
        type: "challenge_entry",
        title: `Your entry "${entry.title}" was not accepted`,
        body: parsed.note || "Contact the Reemora team for details.",
        url: `/lounge/challenges/${id}`,
        dedupe_key: `entry_rejected:${entry.id}:${Date.now()}`,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );
  }
  return NextResponse.json({ ok: true, status: parsed.status });
}

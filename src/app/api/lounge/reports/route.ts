import { NextResponse } from "next/server";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { reportSchema } from "@/lib/lounge/validation";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendWebPushToAdmins } from "@/lib/webpush";

/** File a content report. One report per member per target (unique index)
 *  — a repeat returns 409 instead of piling up duplicates. */
export async function POST(request: Request) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, reportSchema);
  if (parsed instanceof NextResponse) return parsed;

  if (parsed.targetType === "member" && parsed.targetId === ctx.user.id) return jsonError("You can't report yourself.", 400);

  const { error } = await ctx.supabase.from("lounge_reports").insert({
    reporter_id: ctx.user.id,
    target_type: parsed.targetType,
    target_id: parsed.targetId,
    reason: parsed.reason,
  });

  if (error) {
    if (error.code === "23505") return jsonError("You already reported this.", 409);
    return jsonError("Could not send your report.", 400);
  }

  await Promise.all([
    sendTelegramNotification(`🚩 Lounge report (${parsed.targetType}) from ${ctx.member.display_name}:\n${parsed.reason}`),
    sendWebPushToAdmins({ title: "New Lounge report", body: `${ctx.member.display_name} reported a ${parsed.targetType.replace("_", " ")}.`, url: "/admin/lounge/moderation" }),
  ]);

  return NextResponse.json({ ok: true });
}

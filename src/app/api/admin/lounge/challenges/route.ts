import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit } from "@/lib/lounge/api";
import { challengeSchema, CHALLENGE_STATUSES } from "@/lib/lounge/validation";
import { sendWebPushToUsers } from "@/lib/webpush";
import type { LoungeChallengeRow } from "@/lib/supabase/lounge.types";

function toRow(c: z.infer<typeof challengeSchema>) {
  return {
    title: c.title,
    description: c.description,
    rules: c.rules,
    categories: c.categories,
    submissions_open_at: c.submissionsOpenAt,
    submissions_close_at: c.submissionsCloseAt,
    voting_open_at: c.votingOpenAt,
    voting_close_at: c.votingCloseAt,
    max_entries: c.maxEntries,
    allow_vote_change: c.allowVoteChange,
  };
}

/** POST — create a challenge (starts as draft). */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, challengeSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data, error } = await ctx.service.from("lounge_challenges").insert({ ...toRow(parsed), created_by: ctx.user.id }).select("*").single();
  if (error) return jsonError(error.message, 500);
  await logAudit(ctx.service, { actorId: ctx.user.id, action: "challenge.create", targetType: "challenge", targetId: data.id, details: { title: data.title } });
  return NextResponse.json({ ok: true, challenge: data });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  fields: challengeSchema.partial().optional(),
  status: z.enum(CHALLENGE_STATUSES).optional(),
});

/** PATCH — edit fields and/or move status (open, pause, voting, close,
 *  cancel). Finalizing has its own endpoint. */
export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, patchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const { data: current } = await ctx.service.from("lounge_challenges").select("*").eq("id", parsed.id).maybeSingle();
  if (!current) return jsonError("Challenge not found.", 404);
  if (current.status === "finalized" && parsed.status && parsed.status !== "finalized") return jsonError("A finalized challenge can't change status.", 409);
  if (parsed.status === "finalized") return jsonError("Use the finalize action.", 400);

  let update: Partial<LoungeChallengeRow> = {};
  if (parsed.fields) {
    const full = challengeSchema.safeParse({ ...fromRow(current), ...parsed.fields });
    if (!full.success) return jsonError("Invalid challenge fields.", 400);
    update = { ...update, ...toRow(full.data) };
  }
  if (parsed.status) update.status = parsed.status;

  const { data, error } = await ctx.service.from("lounge_challenges").update(update).eq("id", parsed.id).select("*").single();
  if (error) return jsonError(error.message, 500);

  await logAudit(ctx.service, { actorId: ctx.user.id, action: parsed.status ? `challenge.status.${parsed.status}` : "challenge.update", targetType: "challenge", targetId: parsed.id, details: { from: current.status, to: data.status } });

  // Announce entries opening / voting opening to every approved member.
  if (parsed.status && (parsed.status === "open" || parsed.status === "voting") && current.status !== parsed.status) {
    const { data: members } = await ctx.service.from("lounge_members").select("user_id").eq("status", "approved");
    const title = parsed.status === "open" ? `🏁 New Lounge Challenge: ${data.title}` : `🗳️ Voting is open: ${data.title}`;
    const body = parsed.status === "open" ? "Entries are open — submit your project." : "Pick your favourite entry before voting closes.";
    const rows = (members ?? []).map((m) => ({
      user_id: m.user_id,
      type: "challenge",
      title,
      body,
      url: `/lounge/challenges/${data.id}`,
      dedupe_key: `challenge:${data.id}:${parsed.status}:${m.user_id}`,
    }));
    if (rows.length) {
      await ctx.service.from("lounge_notifications").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
      await sendWebPushToUsers(
        rows.map((r) => r.user_id),
        { title, body, url: `/lounge/challenges/${data.id}` }
      );
    }
  }

  return NextResponse.json({ ok: true, challenge: data });
}

function fromRow(c: { title: string; description: string; rules: string | null; categories: string[]; submissions_open_at: string | null; submissions_close_at: string | null; voting_open_at: string | null; voting_close_at: string | null; max_entries: number | null; allow_vote_change: boolean }) {
  return {
    title: c.title,
    description: c.description,
    rules: c.rules ?? "",
    categories: c.categories,
    submissionsOpenAt: c.submissions_open_at ?? "",
    submissionsCloseAt: c.submissions_close_at ?? "",
    votingOpenAt: c.voting_open_at ?? "",
    votingCloseAt: c.voting_close_at ?? "",
    maxEntries: c.max_entries,
    allowVoteChange: c.allow_vote_change,
  };
}

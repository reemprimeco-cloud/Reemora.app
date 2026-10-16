import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";

type Params = { params: Promise<{ id: string }> };
const schema = z.object({ entryId: z.string().uuid() });

const ERRORS: Record<string, [string, number]> = {
  own_entry: ["You can't vote for your own entry.", 400],
  already_voted: ["You already voted in this challenge.", 409],
  voting_closed: ["Voting is closed.", 409],
  voting_not_open_yet: ["Voting hasn't opened yet.", 409],
  entry_not_found: ["Entry not found.", 404],
  not_a_member: ["You need an approved Lounge membership to vote.", 403],
};

/** Cast (or, where the challenge allows it, change) a vote. All rules live
 *  in lounge_cast_vote(); this route only translates its errors. Runs with
 *  the member's own session so auth.uid() inside the function is them. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid challenge id.", 400);
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  const { data, error } = await ctx.supabase.rpc("lounge_cast_vote", { p_entry_id: parsed.entryId });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    if (key) return jsonError(ERRORS[key][0], ERRORS[key][1]);
    console.error("lounge_cast_vote:", error.message);
    return jsonError("Could not record your vote.", 400);
  }

  const { data: entries } = await ctx.supabase.from("lounge_challenge_entries").select("id, vote_count").eq("challenge_id", id).eq("status", "approved");
  return NextResponse.json({ ok: true, result: data, counts: Object.fromEntries((entries ?? []).map((e) => [e.id, e.vote_count])) });
}

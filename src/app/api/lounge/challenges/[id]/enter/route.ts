import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireMember, jsonError } from "@/lib/lounge/api";
import { entrySchema } from "@/lib/lounge/validation";
import { createServiceRoleClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

const ERRORS: Record<string, [string, number]> = {
  entries_closed: ["Entries are closed for this challenge.", 409],
  entries_not_open_yet: ["Entries haven't opened yet.", 409],
  entry_limit_reached: ["This challenge has reached its entry limit.", 409],
  challenge_not_found: ["Challenge not found.", 404],
};

/** POST — submit (or update) the member's single entry. The ownership
 *  confirmation is required by the schema; the entry window and limit are
 *  enforced by the lounge_entry_guard trigger. */
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid challenge id.", 400);

  const parsed = await parseBody(request, entrySchema);
  if (parsed instanceof NextResponse) return parsed;
  if (parsed.challengeId !== id) return jsonError("Challenge mismatch.", 400);

  const ownPrefix = `/storage/v1/object/public/lounge-media/${ctx.user.id}/`;
  const images = [parsed.imageUrl, ...parsed.galleryUrls].filter((u): u is string => Boolean(u));
  if (images.some((u) => !u.includes(ownPrefix))) return jsonError("Images must be uploaded through the Lounge.", 400);

  const values = {
    title: parsed.title,
    description: parsed.description,
    project_url: parsed.projectUrl,
    image_url: parsed.imageUrl ?? null,
    gallery_urls: parsed.galleryUrls,
    tools: parsed.tools ?? [],
    category: parsed.category ?? null,
  };

  const { data: existing } = await ctx.supabase.from("lounge_challenge_entries").select("id, status").match({ challenge_id: id, member_id: ctx.user.id }).maybeSingle();

  if (existing && existing.status !== "withdrawn") {
    const { data: ch } = await ctx.supabase.from("lounge_challenges").select("status").eq("id", id).maybeSingle();
    if (ch?.status !== "open") return jsonError(ERRORS.entries_closed[0], 409);
    const { error } = await ctx.supabase.from("lounge_challenge_entries").update(values).eq("id", existing.id);
    if (error) return jsonError("Could not update your entry.", 400);
    return NextResponse.json({ ok: true, id: existing.id, updated: true });
  }

  if (existing) {
    // Re-entering after a withdrawal: the service role flips it back after
    // re-running the same window checks the trigger applies to inserts.
    const service = await createServiceRoleClient();
    const { data: ch } = await service.from("lounge_challenges").select("status, submissions_open_at, submissions_close_at").eq("id", id).maybeSingle();
    const now = Date.now();
    if (!ch || ch.status !== "open" || (ch.submissions_open_at && now < Date.parse(ch.submissions_open_at)) || (ch.submissions_close_at && now > Date.parse(ch.submissions_close_at))) {
      return jsonError(ERRORS.entries_closed[0], 409);
    }
    const { error } = await service.from("lounge_challenge_entries").update({ ...values, status: "approved" }).eq("id", existing.id);
    if (error) return jsonError("Could not submit your entry.", 400);
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const { data, error } = await ctx.supabase
    .from("lounge_challenge_entries")
    .insert({ challenge_id: id, member_id: ctx.user.id, ...values })
    .select("id")
    .single();

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    if (key) return jsonError(ERRORS[key][0], ERRORS[key][1]);
    if (error.code === "23505") return jsonError("You already entered this challenge.", 409);
    return jsonError("Could not submit your entry.", 400);
  }
  return NextResponse.json({ ok: true, id: data.id });
}

/** DELETE — withdraw. Status isn't in the member column grant, so the
 *  service role does it after confirming ownership and that voting hasn't
 *  started (withdrawing mid-vote would invalidate others' votes). */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireMember();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid challenge id.", 400);

  const service = await createServiceRoleClient();
  const { data: entry } = await service
    .from("lounge_challenge_entries")
    .select("id, status, challenge:lounge_challenges!lounge_challenge_entries_challenge_id_fkey(status)")
    .match({ challenge_id: id, member_id: ctx.user.id })
    .maybeSingle();
  if (!entry) return jsonError("No entry found.", 404);
  const ch = Array.isArray(entry.challenge) ? entry.challenge[0] : entry.challenge;
  if (!ch || !["open", "paused"].includes((ch as { status: string }).status)) return jsonError("Entries can only be withdrawn before voting starts.", 409);

  const { error } = await service.from("lounge_challenge_entries").update({ status: "withdrawn" }).eq("id", entry.id);
  if (error) return jsonError("Could not withdraw your entry.", 500);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, requireUser, jsonError } from "@/lib/lounge/api";
import { isSafeHttpUrl } from "@/lib/lounge/validation";

const schema = z.object({ avatarUrl: z.string().trim().max(400).nullable() });

/** PATCH { avatarUrl } — saves the profile picture on its own, right after
 *  the upload finishes, so it is never lost when another field on the
 *  profile form fails validation. Same ownership rules as /profile: the
 *  update runs under the caller's session (RLS + column grant), and only
 *  files from the caller's own folder in the Lounge bucket are accepted. */
export async function PATCH(request: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  const url = parsed.avatarUrl;
  if (url) {
    const bucketPrefix = `/storage/v1/object/public/lounge-media/${ctx.user.id}/`;
    if (!isSafeHttpUrl(url) || !url.includes(bucketPrefix)) {
      return jsonError("Profile pictures must be uploaded through the Lounge.", 400, { avatarUrl: "invalid" });
    }
  }

  const { data, error } = await ctx.supabase.from("lounge_members").update({ avatar_url: url }).eq("user_id", ctx.user.id).select("avatar_url").maybeSingle();
  if (error) {
    console.error("lounge avatar update:", error.message);
    return jsonError("Could not save your picture.", 500);
  }
  if (!data) return jsonError("No Lounge membership found for this account.", 404);
  return NextResponse.json({ ok: true, avatar_url: data.avatar_url });
}

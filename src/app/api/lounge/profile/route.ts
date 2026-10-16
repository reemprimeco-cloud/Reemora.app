import { NextResponse } from "next/server";
import { parseBody, requireUser, jsonError } from "@/lib/lounge/api";
import { profileSchema } from "@/lib/lounge/validation";
import { evaluateAchievements } from "@/lib/lounge/achievements";

/** Edit the caller's own Lounge profile. The update runs with the caller's
 *  session, so RLS limits it to their row and the column grant in 0026
 *  limits it to profile fields — status/points can't be smuggled in. Any
 *  member (even pending) may polish their profile. */
export async function PATCH(request: Request) {
  const ctx = await requireUser();
  if (ctx instanceof NextResponse) return ctx;

  const parsed = await parseBody(request, profileSchema);
  if (parsed instanceof NextResponse) return parsed;

  const bucketPrefix = `/storage/v1/object/public/lounge-media/${ctx.user.id}/`;
  if (parsed.avatarUrl && !parsed.avatarUrl.includes(bucketPrefix)) {
    return jsonError("Profile pictures must be uploaded through the Lounge.", 400, { avatarUrl: "invalid" });
  }

  const { data, error } = await ctx.supabase
    .from("lounge_members")
    .update({
      display_name: parsed.displayName,
      bio: parsed.bio,
      skills: parsed.skills,
      website_url: parsed.websiteUrl,
      social_links: parsed.socialLinks,
      show_email: parsed.showEmail,
      show_phone: parsed.showPhone,
      avatar_url: parsed.avatarUrl,
    })
    .eq("user_id", ctx.user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("lounge profile update:", error.message);
    return jsonError("Could not save your profile.", 500);
  }
  if (!data) return jsonError("No Lounge membership found for this account.", 404);

  if (data.status === "approved") await evaluateAchievements(ctx.user.id);

  return NextResponse.json({ ok: true, member: data });
}

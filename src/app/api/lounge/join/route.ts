import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { jsonError, parseBody } from "@/lib/lounge/api";
import { joinSchema } from "@/lib/lounge/validation";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendWebPushToAdmins } from "@/lib/webpush";

/** Lounge membership application.
 *
 *  1. Signed-out visitor: creates the Supabase Auth account (the existing
 *     on_auth_user_created trigger provisions public.users) and sends the
 *     confirmation email. No password ever touches our own tables.
 *  2. Already signed-in user (e.g. an existing account): just applies.
 *
 *  Either way the membership row starts as `pending`; nothing here grants
 *  access. Admins decide from /admin/lounge/members. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return jsonError("The Lounge isn't connected yet — please try again later.", 503);

  const parsed = await parseBody(request, joinSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { fullName, email, phone, password } = parsed;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const supabase = await createClient();
  const service = await createServiceRoleClient();

  const { data: current } = await supabase.auth.getUser();
  let userId = current.user?.id ?? null;
  let needsEmailConfirmation = false;

  if (!userId) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${siteUrl}/auth/callback?next=/lounge`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return jsonError("An account with this email already exists. Sign in instead.", 409, { email: "exists" });
      }
      if (msg.includes("password")) return jsonError(error.message, 400, { password: error.message });
      console.error("lounge join signUp:", error.message);
      return jsonError("Could not create your account. Please try again.", 500);
    }

    // With "Confirm email" on, Supabase returns a user with no identities for
    // an address that's already registered (to avoid leaking it) — treat it
    // the same as the explicit error above.
    if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
      return jsonError("An account with this email already exists. Sign in instead.", 409, { email: "exists" });
    }

    userId = data.user.id;
    needsEmailConfirmation = !data.session;
  }

  // The trigger already inserted the users row; fill in the application
  // details it doesn't know about. Only blank fields are set for an
  // existing account so we never overwrite what the person chose before.
  const { data: existingUser } = await service.from("users").select("full_name, phone").eq("id", userId).maybeSingle();
  await service
    .from("users")
    .update({
      full_name: existingUser?.full_name || fullName,
      phone: existingUser?.phone || phone,
    })
    .eq("id", userId);

  const { data: existingMember } = await service.from("lounge_members").select("status").eq("user_id", userId).maybeSingle();
  if (existingMember) {
    return NextResponse.json({ ok: true, status: existingMember.status, needsEmailConfirmation, alreadyApplied: true });
  }

  const { error: memberError } = await service.from("lounge_members").insert({
    user_id: userId,
    display_name: fullName,
    status: "pending",
  });
  if (memberError) {
    console.error("lounge_members insert:", memberError.message);
    return jsonError("Could not save your application. Please try again.", 500);
  }

  await service.from("lounge_membership_events").insert({ user_id: userId, action: "applied", actor_id: userId });

  // Heads-up for the team — same fire-and-forget channels registrations use.
  const adminMessage = `🛋️ New Reemora Lounge application\n${fullName}\n${email}\n${phone}`;
  await Promise.all([
    sendTelegramNotification(adminMessage),
    sendWebPushToAdmins({ title: "New Lounge application", body: `${fullName} applied to join the Lounge.`, url: "/admin/lounge/members" }),
  ]);

  return NextResponse.json({ ok: true, status: "pending", needsEmailConfirmation });
}

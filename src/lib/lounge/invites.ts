import type { Db } from "@/lib/lounge/api";
import { logAudit } from "@/lib/lounge/api";
import { notify } from "@/lib/lounge/notify";

export type InviteChannel = "email" | "link";

export interface InviteInput {
  fullName: string;
  email: string;
  phone: string | null;
}

export interface InviteResult {
  email: string;
  ok: boolean;
  /** What happened, for the admin UI. */
  status: "invited" | "already_member" | "reactivated" | "error";
  message?: string;
  /** Only for the "link" channel: a one-time sign-in link to share by WhatsApp. */
  link?: string | null;
  userId?: string;
}

/** Where every invitation lands: /auth/callback verifies the token and
 *  then sends the member to the set-your-password screen. */
function redirectTarget(siteUrl: string) {
  return `${siteUrl}/auth/callback?next=${encodeURIComponent("/lounge/reset?welcome=1")}`;
}

/** Builds a link our own callback can verify server-side (token_hash),
 *  instead of Supabase's default action link that returns the session in
 *  a URL fragment. */
function tokenHashLink(siteUrl: string, hashedToken: string, type: "invite" | "magiclink") {
  return `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${type}&next=${encodeURIComponent("/lounge/reset?welcome=1")}`;
}

/** Invite one person. Service-role only (called from the admin API).
 *
 *  - New email: creates the auth account via Supabase's invite flow (so
 *    the on_auth_user_created trigger provisions public.users), fills in
 *    name/phone, and creates an *approved* membership.
 *  - Existing account without a membership (or with a pending/rejected
 *    one): approves it and sends a magic link instead.
 *  - Suspended members are left alone; the admin must reactivate first.
 *
 *  channel "email" sends through Supabase Auth's mailer (subject to its
 *  rate limits); "link" returns a URL to send by WhatsApp or by hand. */
export async function inviteMember(service: Db, input: InviteInput, opts: { channel: InviteChannel; actorId: string; siteUrl: string }): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();
  const redirectTo = redirectTarget(opts.siteUrl);

  try {
    const { data: existingUser } = await service.from("users").select("id, full_name, phone").eq("email", email).maybeSingle();
    let userId = existingUser?.id ?? null;
    let link: string | null = null;
    let status: InviteResult["status"] = "invited";

    if (!userId) {
      if (opts.channel === "email") {
        const { data, error } = await service.auth.admin.inviteUserByEmail(email, { data: { full_name: input.fullName }, redirectTo });
        if (error) return { email, ok: false, status: "error", message: error.message };
        userId = data.user.id;
      } else {
        const { data, error } = await service.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name: input.fullName }, redirectTo } });
        if (error) return { email, ok: false, status: "error", message: error.message };
        userId = data.user.id;
        link = tokenHashLink(opts.siteUrl, data.properties.hashed_token, "invite");
      }
    } else {
      const { data: member } = await service.from("lounge_members").select("status").eq("user_id", userId).maybeSingle();
      if (member?.status === "suspended") {
        return { email, ok: false, status: "error", message: "This member is suspended — reactivate them from Lounge Members instead." };
      }
      if (member?.status === "approved") {
        status = "already_member";
      } else if (member) {
        status = "reactivated";
      }
      if (opts.channel === "email") {
        if (status !== "already_member") {
          // signInWithOtp sends Supabase's magic-link email; it must not create accounts.
          const { error } = await service.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
          if (error) return { email, ok: false, status: "error", message: error.message };
        }
      } else {
        const { data, error } = await service.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
        if (error) return { email, ok: false, status: "error", message: error.message };
        link = tokenHashLink(opts.siteUrl, data.properties.hashed_token, "magiclink");
      }
    }

    // The trigger created public.users with just the email; add what the
    // registration told us, without overwriting anything already set.
    const { data: profile } = await service.from("users").select("full_name, phone").eq("id", userId).maybeSingle();
    await service
      .from("users")
      .update({ full_name: profile?.full_name || input.fullName, phone: profile?.phone || input.phone })
      .eq("id", userId);

    if (status !== "already_member") {
      const now = new Date().toISOString();
      await service.from("lounge_members").upsert(
        {
          user_id: userId,
          display_name: profile?.full_name || input.fullName,
          status: "approved",
          invited_at: now,
          invited_by: opts.actorId,
          decided_at: now,
          decided_by: opts.actorId,
          decision_note: "Invited by the Reemora team",
        },
        { onConflict: "user_id" }
      );
      await service.from("lounge_membership_events").insert({ user_id: userId, action: "invited", actor_id: opts.actorId, note: `via ${opts.channel}` });
      await logAudit(service, { actorId: opts.actorId, action: "member.invite", targetType: "member", targetId: userId, details: { email, channel: opts.channel, existing_account: Boolean(existingUser) } });
      await notify(service, {
        userId,
        type: "membership.invited",
        title: "Welcome to the Reemora Lounge 🎉",
        body: "You were invited by the Reemora team. Say hello in the chat and share what you're building.",
        url: "/lounge",
        dedupeKey: `invited:${userId}`,
        push: false,
      });
    }

    return { email, ok: true, status, link, userId };
  } catch (err) {
    return { email, ok: false, status: "error", message: err instanceof Error ? err.message : "Unexpected error" };
  }
}

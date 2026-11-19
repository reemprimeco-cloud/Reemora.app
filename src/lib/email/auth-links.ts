import type { Db } from "@/lib/lounge/api";
import { buildAuthEmail, type AuthEmailKind } from "@/lib/email/auth-templates";
import { sendEmail } from "@/lib/email/send";

type LinkType = "invite" | "magiclink" | "recovery";

/** A one-time sign-in link on our own /auth/confirm page, which verifies
 *  only when the person taps "Continue" (link previews and mail scanners
 *  open links on arrival and would otherwise spend them). */
export function confirmLink(siteUrl: string, hashedToken: string, type: LinkType, next: string): string {
  return `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${type}&next=${encodeURIComponent(next)}`;
}

/** Generates a sign-in link with the service role (no Supabase mail is
 *  sent, so the built-in hourly cap does not apply) and emails it from
 *  Reemora. Returns the new user's id for "invite" links. */
export async function sendAuthLinkEmail(
  service: Db,
  opts: { email: string; type: LinkType; kind: AuthEmailKind; next: string; siteUrl: string; name?: string | null; data?: Record<string, unknown> }
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data, error } = await service.auth.admin.generateLink(
    opts.type === "invite"
      ? { type: "invite", email: opts.email, options: { data: opts.data } }
      : { type: opts.type, email: opts.email }
  );
  if (error || !data?.properties?.hashed_token) return { ok: false, error: error?.message ?? "Could not create the sign-in link." };
  const link = confirmLink(opts.siteUrl, data.properties.hashed_token, opts.type, opts.next);
  const mail = buildAuthEmail(opts.kind, { link, name: opts.name, siteUrl: opts.siteUrl });
  const sent = await sendEmail({ to: opts.email, ...mail });
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true, userId: data.user.id };
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { brandedEmailEnabled } from "@/lib/email/send";
import { sendAuthLinkEmail } from "@/lib/email/auth-links";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** Seconds a person must wait between two reset emails to the same address. */
const RESEND_GAP_SECONDS = 60;

/** POST { email } — sends a Reemora-branded password-reset email.
 *
 *  Responses never say whether the address has an account. When branded
 *  email is not configured yet the reply is { fallback: true } and the page
 *  uses Supabase's own reset email instead. The link lands on /reset, which
 *  sends admins to the admin reset page and members to the Lounge one. */
export async function POST(request: Request) {
  if (!brandedEmailEnabled()) return NextResponse.json({ fallback: true });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;

  const service = await createServiceRoleClient();
  const { data: profile } = await service.from("users").select("id, full_name").eq("email", email).maybeSingle();
  if (!profile) return NextResponse.json({ ok: true });

  // generateLink has no rate limit of its own; keep one address from being
  // flooded by repeated taps or by someone else.
  const { data: authUser } = await service.auth.admin.getUserById(profile.id);
  const lastSent = authUser?.user?.recovery_sent_at ? Date.parse(authUser.user.recovery_sent_at) : 0;
  if (lastSent && Date.now() - lastSent < RESEND_GAP_SECONDS * 1000) return NextResponse.json({ ok: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const sent = await sendAuthLinkEmail(service, { email, type: "recovery", kind: "reset", next: "/reset", siteUrl, name: profile.full_name });
  if (!sent.ok) {
    console.error("reset email failed:", sent.error);
    return NextResponse.json({ ok: false, error: "We couldn't send the email right now. Please try again in a few minutes." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody } from "@/lib/lounge/api";
import { inviteMember } from "@/lib/lounge/invites";

const schema = z.object({
  channel: z.enum(["email", "link"]),
  invites: z
    .array(
      z.object({
        fullName: z.string().trim().min(2).max(100),
        email: z.string().trim().toLowerCase().email().max(254),
        phone: z.string().trim().max(30).optional().nullable(),
      })
    )
    .min(1)
    .max(50),
});

/** POST — invite up to 50 people at once. Admin only; every invitation is
 *  audited and creates a pre-approved membership. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  // Canonical host (www) so the links Supabase redirects to are in the
  // allow-list; falls back to whatever host the admin is using.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const results = [];
  for (const invite of parsed.invites) {
    results.push(await inviteMember(ctx.service, { fullName: invite.fullName, email: invite.email, phone: invite.phone || null }, { channel: parsed.channel, actorId: ctx.user.id, siteUrl }));
  }
  return NextResponse.json({ ok: true, results });
}

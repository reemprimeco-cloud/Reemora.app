import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseBody, jsonError, logAudit, type Db } from "@/lib/lounge/api";
import { brandedEmailEnabled } from "@/lib/email/send";
import { sendAuthLinkEmail } from "@/lib/email/auth-links";
import { needsAccessEmail } from "@/lib/lounge/access-emails";

// Sends are spaced out to stay under Resend's per-second limit.
export const maxDuration = 60;
const SEND_GAP_MS = 600;
const WELCOME_NEXT = "/lounge/reset?welcome=1";

interface Target {
  user_id: string;
  email: string;
  name: string;
}

async function findTargets(service: Db): Promise<Target[]> {
  const { data: signals, error } = await service.rpc("lounge_access_signals");
  if (error) throw new Error(error.message);
  const ids = (signals ?? []).map((s) => s.user_id);
  if (ids.length === 0) return [];
  const { data: users } = await service.from("users").select("id, email, full_name, role").in("id", ids);
  const { data: members } = await service.from("lounge_members").select("user_id, display_name").in("user_id", ids);
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const names = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));
  const targets: Target[] = [];
  for (const s of signals ?? []) {
    const u = byId.get(s.user_id);
    if (!u?.email) continue;
    if (!needsAccessEmail(s, { isAdmin: u.role === "admin" })) continue;
    targets.push({ user_id: s.user_id, email: u.email, name: names.get(s.user_id) || u.full_name || u.email });
  }
  return targets.sort((a, b) => a.name.localeCompare(b.name));
}

/** GET — preview: approved members who haven't got into their account yet. */
export async function GET() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  try {
    const targets = await findTargets(ctx.service);
    return NextResponse.json({ ok: true, enabled: brandedEmailEnabled(), targets: targets.map(({ user_id, name, email }) => ({ user_id, name, email })) });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not load members.", 500);
  }
}

const schema = z.object({ userIds: z.array(z.string().uuid()).min(1).max(200) });

/** POST { userIds } — emails each listed member the Reemora "set your
 *  password" link. Only ids that still qualify are sent to, so a stale
 *  preview can't email someone who has since signed in. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  if (!brandedEmailEnabled()) return jsonError("Branded email is not configured.", 409);
  const parsed = await parseBody(request, schema);
  if (parsed instanceof NextResponse) return parsed;

  const wanted = new Set(parsed.userIds);
  const targets = (await findTargets(ctx.service)).filter((t) => wanted.has(t.user_id));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];
  for (const [i, t] of targets.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    const res = await sendAuthLinkEmail(ctx.service, { email: t.email, type: "recovery", kind: "welcome", next: WELCOME_NEXT, siteUrl, name: t.name });
    if (res.ok) sent.push(t.email);
    else failed.push({ email: t.email, error: res.error });
  }

  await logAudit(ctx.service, {
    actorId: ctx.user.id,
    action: "member.access_email",
    targetType: "member",
    targetId: null,
    details: { sent: sent.length, failed: failed.length, skipped: parsed.userIds.length - targets.length },
  });
  return NextResponse.json({ ok: true, sent: sent.length, failed, skipped: parsed.userIds.length - targets.length });
}

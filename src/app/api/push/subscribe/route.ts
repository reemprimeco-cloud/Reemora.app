import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/** Registers (or re-registers) a push subscription for the signed-in user
 *  — an admin (back-office alerts) or a Lounge member (community
 *  activity). The user id comes from the verified session, never from the
 *  body. The write uses the service role so that a browser endpoint that
 *  was previously registered by a different account on the same device is
 *  simply re-pointed at the current user instead of failing RLS. */
export async function POST(request: Request) {
  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.slice(0, 2000) : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh.slice(0, 500) : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth.slice(0, 500) : "";

  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const service = await createServiceRoleClient();
  const { error } = await service
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth, user_id: userData.user.id }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

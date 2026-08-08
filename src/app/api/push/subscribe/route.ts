import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Registers (or re-registers) a push subscription for the logged-in
 *  admin. Uses the cookie-authenticated client, not the service role, so
 *  RLS (public.is_admin()) enforces that only an actual admin can write
 *  here — no manual role check needed. */
export async function POST(request: Request) {
  let body: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint, p256dh, auth, user_id: userData.user.id }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

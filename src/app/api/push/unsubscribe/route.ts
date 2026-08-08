import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { endpoint?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

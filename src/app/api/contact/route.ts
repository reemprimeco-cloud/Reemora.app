import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = clean(body.name, 200);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 30);
  const subject = clean(body.subject, 200);
  const message = clean(body.message, 5000);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please enter your name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Please enter a valid email address.";
  if (message.length < 5) fieldErrors.message = "Please enter a message.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "The contact form isn't connected yet — please email us directly." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone: phone || null,
    subject: subject || null,
    message,
  });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

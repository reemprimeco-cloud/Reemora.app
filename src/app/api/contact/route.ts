import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

export async function POST(request: Request) {
  let body: { name: string; email: string; phone?: string; subject?: string; message: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, email, phone, subject, message } = body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "The contact form isn't connected yet — please email us directly." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    subject: subject?.trim() || null,
    message: message.trim(),
  });

  if (error) {
    console.error("contact_messages insert error:", error.message);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

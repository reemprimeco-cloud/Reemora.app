import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

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

  const fullName = clean(body.fullName, 200);
  const phone = clean(body.phone, 30);
  const courseId = clean(body.courseId, 40) || null;
  const courseScheduleId = clean(body.courseScheduleId, 40) || null;

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.fullName = "Please enter your full name.";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Please enter a valid mobile number.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "The waitlist isn't connected yet — please email us directly." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_waitlist").insert({
    course_id: courseId,
    course_schedule_id: courseScheduleId,
    full_name: fullName,
    phone,
  });

  if (error) {
    console.error("course_waitlist insert error:", error.message);
    return NextResponse.json({ error: "Could not join the waitlist. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

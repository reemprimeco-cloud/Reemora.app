import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 30);
  const preferredDateRaw = clean(body.preferredDate, 10);
  const preferredTime = clean(body.preferredTime, 100);
  const notes = clean(body.notes, 2000);
  const courseId = clean(body.courseId, 40) || null;
  const groupSizeRaw = body.groupSize;
  const groupSize =
    typeof groupSizeRaw === "number" && Number.isFinite(groupSizeRaw) && groupSizeRaw > 0
      ? Math.min(1000, Math.trunc(groupSizeRaw))
      : null;
  const certificateNeeded = body.certificateNeeded === true;

  const fieldErrors: Record<string, string> = {};
  if (fullName.length < 2) fieldErrors.fullName = "Please enter your full name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Please enter a valid email address.";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Please enter a valid phone number.";
  if (preferredDateRaw && !DATE_RE.test(preferredDateRaw)) fieldErrors.preferredDate = "Please enter a valid date.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "This form isn't connected yet — please email us directly." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("private_session_requests").insert({
    course_id: courseId,
    full_name: fullName,
    email,
    phone,
    preferred_date: preferredDateRaw || null,
    preferred_time: preferredTime || null,
    group_size: groupSize,
    certificate_needed: certificateNeeded,
    notes: notes || null,
  });

  if (error) {
    console.error("private_session_requests insert error:", error.message);
    return NextResponse.json({ error: "Could not send your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

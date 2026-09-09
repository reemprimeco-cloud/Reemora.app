import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

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

  const courseId = clean(body.courseId, 40);
  const studentName = clean(body.studentName, 200);
  const roleCompany = clean(body.roleCompany, 200);
  const quote = clean(body.quote, 2000);
  const rating = Number(body.rating);

  const fieldErrors: Record<string, string> = {};
  if (!courseId) fieldErrors.courseId = "Please select a course.";
  if (studentName.length < 2) fieldErrors.studentName = "Please enter your name.";
  if (quote.length < 5) fieldErrors.quote = "Please share a few words of feedback.";
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) fieldErrors.rating = "Please choose a rating.";

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Feedback isn't connected yet — please try again later." }, { status: 503 });
  }

  const supabase = await createClient();
  // Always inserted unpublished — it only goes live once an admin
  // approves it from the Testimonials page, regardless of what a client
  // sends here (the RLS insert policy also enforces this server-side).
  const { error } = await supabase.from("testimonials").insert({
    course_id: courseId,
    student_name: studentName,
    role_company: roleCompany || null,
    quote,
    rating,
    is_published: false,
  });

  if (error) {
    console.error("feedback insert error:", error.message);
    return NextResponse.json({ error: "Could not save your feedback. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createMyFatoorahPayment } from "@/lib/myfatoorah";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { computeOrderTotal, type Attendee } from "@/lib/course-utils";
import { formatMoney } from "@/lib/utils";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendWebPushToAdmins } from "@/lib/webpush";
import type { Json } from "@/lib/supabase/database.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;
const MAX_SEATS = 10;

/** Parse an attendee entry from the request body. Trims strings, drops
 *  everything else. Missing fields become empty string so validation can
 *  produce a per-field error message. */
function parseAttendee(raw: unknown): Attendee {
  if (!raw || typeof raw !== "object") return { full_name: "", email: "", phone: "" };
  const obj = raw as Record<string, unknown>;
  return {
    full_name: typeof obj.full_name === "string" ? obj.full_name.trim() : "",
    email: typeof obj.email === "string" ? obj.email.trim() : "",
    phone: typeof obj.phone === "string" ? obj.phone.trim() : "",
  };
}

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Registrations are not available yet — the backend is still being configured." },
      { status: 503 }
    );
  }

  let body: {
    courseScheduleId?: unknown;
    fullName?: unknown;
    email?: unknown;
    phone?: unknown;
    notes?: unknown;
    attendees?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const courseScheduleId = typeof body.courseScheduleId === "string" ? body.courseScheduleId.trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const extraAttendeesRaw = Array.isArray(body.attendees) ? body.attendees.slice(0, MAX_SEATS - 1) : [];
  const extraAttendees = extraAttendeesRaw.map(parseAttendee);
  // Seats = booker (1) + extra attendee entries. Never trust a client-sent
  // seat count — derive it from the attendees list.
  const seats = 1 + extraAttendees.length;

  const fieldErrors: Record<string, string> = {};
  if (!courseScheduleId) fieldErrors.courseScheduleId = "Missing course selection.";
  if (fullName.length < 2) fieldErrors.fullName = "Please enter your full name.";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Please enter a valid email address.";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Please enter a valid phone number.";
  if (seats < 1 || seats > MAX_SEATS) {
    fieldErrors.seats = `Seats must be between 1 and ${MAX_SEATS}.`;
  }
  extraAttendees.forEach((a, i) => {
    const label = `attendee_${i + 2}`;
    if (a.full_name.length < 2) fieldErrors[`${label}_name`] = "Attendee name is required.";
    if (!EMAIL_RE.test(a.email)) fieldErrors[`${label}_email`] = "Attendee email is invalid.";
    if (!PHONE_RE.test(a.phone)) fieldErrors[`${label}_phone`] = "Attendee phone is invalid.";
  });

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  const { data: schedule, error: scheduleError } = await supabase
    .from("course_schedule")
    .select("id, seats_available, status, courses(id, slug, title, price, currency, is_published, registration_open)")
    .eq("id", courseScheduleId)
    .maybeSingle();

  if (scheduleError || !schedule) {
    return NextResponse.json({ error: "This course cohort could not be found." }, { status: 404 });
  }

  const course = Array.isArray(schedule.courses) ? schedule.courses[0] : schedule.courses;
  if (!course || !course.is_published) {
    return NextResponse.json({ error: "This course is not currently available for registration." }, { status: 404 });
  }

  if (!course.registration_open) {
    return NextResponse.json(
      { error: "Registration for this course isn't open yet. Check back soon or ask a question below." },
      { status: 403 }
    );
  }

  if (schedule.status === "cancelled" || schedule.status === "completed") {
    return NextResponse.json({ error: "This cohort is no longer open for registration." }, { status: 409 });
  }

  if (seats > schedule.seats_available) {
    return NextResponse.json(
      { error: `Only ${schedule.seats_available} seat${schedule.seats_available === 1 ? "" : "s"} left for this cohort.` },
      { status: 409 }
    );
  }

  const { subtotal, discount, total } = computeOrderTotal(course.price, seats);

  // Full attendee list stored on the registration = booker (seat 1) + extras.
  const attendeesForDb: Attendee[] = [
    { full_name: fullName, email, phone },
    ...extraAttendees,
  ];

  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({
      course_schedule_id: courseScheduleId,
      full_name: fullName,
      email,
      phone,
      seats,
      notes: notes || null,
      amount: total,
      discount_amount: discount,
      // The DB column is jsonb; Attendee's shape (string fields only) is
      // trivially JSON-serialisable, cast to satisfy Supabase's Json union.
      attendees: attendeesForDb as unknown as Json,
      currency: course.currency,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !registration) {
    console.error("registration insert error:", insertError?.message);
    return NextResponse.json({ error: "Could not save your registration. Please try again." }, { status: 500 });
  }

  // Notify as soon as the order exists — this is the "someone registered"
  // moment, independent of whether payment completes right after.
  await Promise.all([
    sendTelegramNotification(
      [
        "🎓 New course registration",
        `Course: ${course.title}`,
        `Name: ${fullName}`,
        `Seats: ${seats}`,
        `Total: ${formatMoney(total, course.currency)}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
      ].join("\n")
    ),
    sendWebPushToAdmins({
      title: "🎓 New course registration",
      body: `${fullName} registered for ${course.title} — ${formatMoney(total, course.currency)}`,
      url: "/admin/registrations",
    }),
  ]);

  // Read the site-wide payment mode. Defaults to MyFatoorah when the
  // settings row is missing so a fresh install never silently switches to
  // manual mode.
  const { data: settingsRows } = await supabase
    .from("website_settings")
    .select("key, value")
    .eq("key", "payment_mode");
  const paymentMode = settingsRows?.[0]?.value === "whatsapp_manual" ? "whatsapp_manual" : "myfatoorah";

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      registration_id: registration.id,
      amount: total,
      currency: course.currency,
      status: "pending",
      method: paymentMode === "whatsapp_manual" ? "whatsapp_manual" : "myfatoorah",
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error("payment insert error:", paymentError?.message);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }

  if (paymentMode === "whatsapp_manual") {
    // Temporary fallback while MyFatoorah is switched off: skip the
    // gateway entirely. Staff message the student directly using the
    // phone number they just submitted (the Registrations admin table has
    // a WhatsApp button per row for exactly this). The student sees an
    // on-site thank-you page telling them a payment link is coming.
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "created",
      status: "awaiting_manual_whatsapp",
      raw_response: { subtotal, discount, total },
    });

    return NextResponse.json({
      whatsappManual: true,
      registrationId: registration.id,
    });
  }

  try {
    const { invoiceUrl, invoiceId } = await createMyFatoorahPayment({
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      amount: total,
      currency: course.currency,
      reference: payment.id,
      itemName: seats > 1 ? `${course.title} × ${seats} seats` : course.title,
      callbackUrl: `${siteUrl}/api/payments/callback?paymentRowId=${payment.id}&courseSlug=${course.slug}`,
      errorUrl: `${siteUrl}/register/${course.slug}?status=failed&ref=${registration.id}`,
    });

    await supabase.from("payments").update({ myfatoorah_invoice_id: String(invoiceId) }).eq("id", payment.id);
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "created",
      status: "invoice_created",
      raw_response: { invoiceId, invoiceUrl, subtotal, discount, total },
    });

    return NextResponse.json({ invoiceUrl, registrationId: registration.id });
  } catch (err) {
    console.error("MyFatoorah error:", err);
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "error",
      status: "create_failed",
      raw_response: { message: String(err) },
    });

    return NextResponse.json(
      {
        error:
          "Your registration was saved, but we couldn't reach the payment gateway. Our team will follow up to complete payment.",
        registrationId: registration.id,
        savedOnly: true,
      },
      { status: 502 }
    );
  }
}

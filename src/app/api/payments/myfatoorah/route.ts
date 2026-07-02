import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createMyFatoorahPayment } from "@/lib/myfatoorah";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  let body: {
    courseScheduleId: string;
    courseSlug: string;
    courseTitle: string;
    fullName: string;
    email: string;
    phone: string;
    seats: number;
    notes?: string;
    unitPrice: number;
    currency: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { courseScheduleId, courseSlug, courseTitle, fullName, email, phone, seats, notes, unitPrice, currency } = body;

  if (!courseScheduleId || !fullName || !email || !phone || !seats || seats < 1) {
    return NextResponse.json({ error: "Missing required registration fields" }, { status: 400 });
  }

  const amount = Number((unitPrice * seats).toFixed(2));

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Registrations are not available yet — the backend is still being configured." },
      { status: 503 }
    );
  }

  const supabase = await createServiceRoleClient();

  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({
      course_schedule_id: courseScheduleId,
      full_name: fullName,
      email,
      phone,
      seats,
      notes: notes || null,
      amount,
      currency,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !registration) {
    console.error("registration insert error:", insertError?.message);
    return NextResponse.json({ error: "Could not save your registration. Please try again." }, { status: 500 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      registration_id: registration.id,
      amount,
      currency,
      status: "pending",
      method: "myfatoorah",
    })
    .select()
    .single();

  if (paymentError || !payment) {
    console.error("payment insert error:", paymentError?.message);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }

  try {
    const { invoiceUrl, invoiceId } = await createMyFatoorahPayment({
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      amount,
      currency,
      reference: payment.id,
      itemName: courseTitle,
      callbackUrl: `${siteUrl}/api/payments/callback?paymentRowId=${payment.id}&courseSlug=${courseSlug}`,
      errorUrl: `${siteUrl}/register/${courseSlug}?status=failed&ref=${registration.id}`,
    });

    await supabase.from("payments").update({ myfatoorah_invoice_id: String(invoiceId) }).eq("id", payment.id);
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "created",
      status: "invoice_created",
      raw_response: { invoiceId, invoiceUrl },
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

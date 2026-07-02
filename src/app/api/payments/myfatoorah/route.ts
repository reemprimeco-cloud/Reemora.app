import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createMyFatoorahPayment } from "@/lib/myfatoorah";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

export async function POST(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  let body: {
    courseId: string;
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

  const { courseId, courseSlug, courseTitle, fullName, email, phone, seats, notes, unitPrice, currency } = body;

  if (!courseId || !fullName || !email || !phone || !seats || seats < 1) {
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
      course_id: courseId,
      full_name: fullName,
      email,
      phone,
      seats,
      notes: notes || null,
      amount,
      currency,
      payment_status: "pending",
    })
    .select()
    .single();

  if (insertError || !registration) {
    console.error("registration insert error:", insertError?.message);
    return NextResponse.json({ error: "Could not save your registration. Please try again." }, { status: 500 });
  }

  try {
    const { invoiceUrl, invoiceId } = await createMyFatoorahPayment({
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      amount,
      currency,
      reference: registration.id,
      itemName: courseTitle,
      callbackUrl: `${siteUrl}/api/payments/callback?registrationId=${registration.id}&courseSlug=${courseSlug}`,
      errorUrl: `${siteUrl}/register/${courseSlug}?status=failed&ref=${registration.id}`,
    });

    await supabase
      .from("registrations")
      .update({ myfatoorah_invoice_id: String(invoiceId) })
      .eq("id", registration.id);

    return NextResponse.json({ invoiceUrl, registrationId: registration.id });
  } catch (err) {
    console.error("MyFatoorah error:", err);
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

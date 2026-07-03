import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMyFatoorahPaymentStatus } from "@/lib/myfatoorah";
import type { Json } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId"); // MyFatoorah's PaymentId
  const paymentRowId = url.searchParams.get("paymentRowId"); // our payments.id
  const courseSlug = url.searchParams.get("courseSlug") || "";

  const redirectBase = `${url.origin}/register/${courseSlug}`;

  if (!paymentId || !paymentRowId) {
    return NextResponse.redirect(`${redirectBase}?status=failed`);
  }

  const supabase = await createServiceRoleClient();

  try {
    const mfStatus = await getMyFatoorahPaymentStatus(paymentId);

    const { data: payment } = await supabase
      .from("payments")
      .select("*, registrations(id, course_schedule_id, seats)")
      .eq("id", paymentRowId)
      .maybeSingle();

    if (!payment) {
      return NextResponse.redirect(`${redirectBase}?status=failed`);
    }

    // Only trust "Paid" when the invoice MyFatoorah confirms also matches
    // the amount we originally requested — guards against a stale or
    // mismatched paymentId being replayed against a different invoice.
    const amountMatches = Math.abs(Number(mfStatus.InvoiceValue) - Number(payment.amount)) < 0.01;
    const isPaid = mfStatus.InvoiceStatus === "Paid" && amountMatches;
    if (mfStatus.InvoiceStatus === "Paid" && !amountMatches) {
      console.error(`payment callback: amount mismatch for payment ${paymentRowId} — expected ${payment.amount}, got ${mfStatus.InvoiceValue}`);
    }

    // The callback can legitimately fire more than once for the same
    // payment (browser back/refresh after redirect, a network-level retry,
    // MyFatoorah re-sending the callback). Updating payment/registration
    // status again is harmless (same value in, same value out), but
    // decrement_seats is not idempotent — running it twice would deduct a
    // seat twice for one registration. Only decrement on the transition
    // into "paid", never on a repeat callback that finds it already paid.
    const wasAlreadyPaid = payment.status === "paid";

    await supabase
      .from("payments")
      .update({
        status: isPaid ? "paid" : "failed",
        myfatoorah_payment_id: paymentId,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq("id", paymentRowId);

    await supabase.from("payment_transactions").insert({
      payment_id: paymentRowId,
      event_type: "callback",
      status: mfStatus.InvoiceStatus,
      raw_response: mfStatus as unknown as Json,
    });

    const registration = Array.isArray(payment.registrations) ? payment.registrations[0] : payment.registrations;

    if (registration) {
      await supabase
        .from("registrations")
        .update({ status: isPaid ? "confirmed" : "cancelled" })
        .eq("id", registration.id);

      if (isPaid && !wasAlreadyPaid) {
        await supabase.rpc("decrement_seats", {
          p_schedule_id: registration.course_schedule_id,
          p_seats: registration.seats,
        });
      }
    }

    return NextResponse.redirect(
      `${redirectBase}?status=${isPaid ? "success" : "failed"}&ref=${registration?.id ?? ""}`
    );
  } catch (err) {
    console.error("payment callback error:", err);
    return NextResponse.redirect(`${redirectBase}?status=failed`);
  }
}

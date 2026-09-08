import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { createCheckoutLink, loadPaymentContext, siteUrlFrom } from "@/lib/payments/checkout";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Pay now" for an outstanding installment. The public /pay/[id] page
 *  posts here; we mint a fresh UPayments checkout link for that payment
 *  row and send the student straight to it. */
export async function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await context.params;
  const siteUrl = siteUrlFrom(request);
  const back = `${siteUrl}/pay/${paymentId}`;

  if (!isSupabaseConfigured || !UUID_RE.test(paymentId)) {
    return NextResponse.redirect(`${back}?status=failed`, 303);
  }

  const supabase = await createServiceRoleClient();
  const ctx = await loadPaymentContext(supabase, paymentId);
  if (!ctx) return NextResponse.redirect(`${siteUrl}/courses`, 303);

  if (ctx.payment.status === "paid") {
    return NextResponse.redirect(`${back}?status=success`, 303);
  }
  if (ctx.registration.status === "cancelled" || ctx.registration.status === "refunded") {
    return NextResponse.redirect(`${back}?status=closed`, 303);
  }

  const form = await request.formData().catch(() => null);
  const lang = form?.get("lang") === "ar" ? "ar" : "en";

  try {
    const { link } = await createCheckoutLink(supabase, ctx, { siteUrl, lang });
    return NextResponse.redirect(link, 303);
  } catch (err) {
    console.error("installment checkout error:", err);
    await supabase.from("payment_transactions").insert({
      payment_id: paymentId,
      event_type: "error",
      status: "create_failed",
      raw_response: { message: String(err) },
    });
    return NextResponse.redirect(`${back}?status=gateway_error`, 303);
  }
}

import { NextResponse } from "next/server";
import { reconcileUPaymentTransaction } from "@/lib/payment-reconciliation";

/** Both UPayments' returnUrl (success) and cancelUrl (cancel/failure)
 *  point here. UPayments appends its own query params to whichever one it
 *  redirects the browser to — including track_id — so a single handler
 *  that always re-verifies server-to-server covers both cases; we never
 *  trust which URL variant was hit or any status value in the query
 *  string itself. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get("track_id");
  const courseSlugFallback = url.searchParams.get("courseSlug") || "";

  if (!trackId) {
    return NextResponse.redirect(`${url.origin}/register/${courseSlugFallback}?status=failed`);
  }

  const result = await reconcileUPaymentTransaction(trackId);
  const courseSlug = result.courseSlug || courseSlugFallback;
  const redirectBase = `${url.origin}/register/${courseSlug}`;

  if (!result.ok) {
    return NextResponse.redirect(`${redirectBase}?status=failed`);
  }

  return NextResponse.redirect(
    `${redirectBase}?status=${result.isPaid ? "success" : "failed"}&ref=${result.registrationId ?? ""}`
  );
}

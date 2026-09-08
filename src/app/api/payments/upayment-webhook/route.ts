import { NextResponse } from "next/server";
import { reconcileUPaymentTransaction } from "@/lib/payment-reconciliation";

/** Async server-to-server notification UPayments POSTs to notificationUrl
 *  (a mandatory field on invoice creation). This is a backup path to the
 *  browser return/cancel redirect — it covers a student closing their
 *  browser or losing connection before the redirect completes. The exact
 *  payload shape isn't confirmed, so this parses defensively for a
 *  track_id under a few plausible locations rather than assuming one
 *  fixed structure; reconcileUPaymentTransaction always re-verifies via a
 *  real API call regardless of what the webhook body claims. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "ignored", reason: "invalid json" }, { status: 200 });
  }

  const trackId = extractTrackId(body);
  if (!trackId) {
    console.error("UPayments webhook: no track_id found in payload", JSON.stringify(body));
    // Still 200 — a malformed/unexpected payload isn't something UPayments
    // should keep retrying forever.
    return NextResponse.json({ status: "ignored", reason: "no track_id" }, { status: 200 });
  }

  await reconcileUPaymentTransaction(trackId);
  return NextResponse.json({ status: "ok" });
}

function extractTrackId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;

  const direct = obj.track_id;
  if (typeof direct === "string") return direct;

  const data = obj.data;
  if (data && typeof data === "object") {
    const transaction = (data as Record<string, unknown>).transaction;
    if (transaction && typeof transaction === "object") {
      const nested = (transaction as Record<string, unknown>).track_id;
      if (typeof nested === "string") return nested;
    }
    const dataTrackId = (data as Record<string, unknown>).track_id;
    if (typeof dataTrackId === "string") return dataTrackId;
  }

  const transaction = obj.transaction;
  if (transaction && typeof transaction === "object") {
    const nested = (transaction as Record<string, unknown>).track_id;
    if (typeof nested === "string") return nested;
  }

  return null;
}

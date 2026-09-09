import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getUPaymentStatusByTrackId,
  getUPaymentStatusByInvoiceId,
  isUPaymentCaptured,
  type UPaymentTransaction,
} from "@/lib/upayment";
import type { Json } from "@/lib/supabase/database.types";

interface ReconcileResult {
  ok: boolean;
  isPaid: boolean;
  registrationId: string | null;
  courseSlug: string | null;
}

/** The single place that decides "did this UPayments transaction actually
 *  succeed, and what do we do about it" — used by both the browser
 *  return/cancel redirect and the async notification webhook, so a
 *  student closing their browser before the redirect fires doesn't leave
 *  a paid registration stuck as pending.
 *
 *  Always re-verifies server-to-server via track_id — never trusts a
 *  status value handed to us by the redirect query string or webhook
 *  body, since either could be spoofed.
 *
 *  Idempotent: calling this twice for the same track_id (browser retry,
 *  webhook redelivery) only decrements a seat / confirms the registration
 *  once, guarded by the payment row's own status column.
 */
export async function reconcileUPaymentTransaction(trackId: string): Promise<ReconcileResult> {
  let transaction;
  try {
    transaction = await getUPaymentStatusByTrackId(trackId);
  } catch (err) {
    console.error("reconcileUPaymentTransaction: status lookup failed", err);
    return { ok: false, isPaid: false, registrationId: null, courseSlug: null };
  }
  return applyTransaction(transaction);
}

/** Same reconciliation, entered from the invoice id instead of a
 *  track_id. This is the path that doesn't depend on UPayments telling us
 *  anything — we ask them. */
export async function reconcileUPaymentByInvoiceId(
  invoiceId: string,
  knownPaymentId?: string
): Promise<ReconcileResult> {
  let transaction;
  try {
    transaction = await getUPaymentStatusByInvoiceId(invoiceId);
  } catch (err) {
    console.error(`reconcileUPaymentByInvoiceId: status lookup failed for invoice ${invoiceId}`, err);
    return { ok: false, isPaid: false, registrationId: null, courseSlug: null };
  }
  if (!transaction) {
    console.error(`reconcileUPaymentByInvoiceId: invoice ${invoiceId} returned no transaction`);
    return { ok: false, isPaid: false, registrationId: null, courseSlug: null };
  }
  return applyTransaction(transaction, knownPaymentId);
}

/** Re-checks every first-installment UPayments payment still sitting at
 *  "pending" and settles any that have actually been captured. Safe to
 *  run repeatedly: applyTransaction is idempotent, and a still-unpaid
 *  invoice simply stays pending. */
export async function reconcilePendingUPayments(): Promise<{ checked: number; confirmed: number }> {
  const supabase = await createServiceRoleClient();

  const { data: pending, error } = await supabase
    .from("payments")
    .select("id, gateway_invoice_id")
    .eq("method", "upayment")
    .eq("status", "pending")
    .is("due_date", null)
    .not("gateway_invoice_id", "is", null);

  if (error || !pending?.length) {
    if (error) console.error("reconcilePendingUPayments: query failed", error.message);
    return { checked: 0, confirmed: 0 };
  }

  let confirmed = 0;
  for (const payment of pending) {
    if (!payment.gateway_invoice_id) continue;
    // We already know which row we're asking about, so matching doesn't
    // depend on UPayments echoing our order id back.
    const result = await reconcileUPaymentByInvoiceId(payment.gateway_invoice_id, payment.id);
    if (result.ok && result.isPaid) confirmed += 1;
  }

  return { checked: pending.length, confirmed };
}

async function applyTransaction(
  transaction: UPaymentTransaction,
  knownPaymentId?: string
): Promise<ReconcileResult> {
  const supabase = await createServiceRoleClient();

  // Normally we match on order.id coming back as merchant_requested_order_id.
  // knownPaymentId covers the sweep, which already knows the row and so
  // doesn't care whether the gateway echoed anything useful back.
  const paymentId = knownPaymentId ?? transaction.merchant_requested_order_id;
  const { data: payment } = await supabase
    .from("payments")
    .select("*, registrations(id, course_schedule_id, seats, status, course_schedule(courses(slug)))")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    console.error(
      `applyTransaction: no payment row for order id ${paymentId} — transaction was ${JSON.stringify(transaction)}`
    );
    return { ok: false, isPaid: false, registrationId: null, courseSlug: null };
  }

  const registration = Array.isArray(payment.registrations) ? payment.registrations[0] : payment.registrations;
  const schedule = registration
    ? Array.isArray(registration.course_schedule)
      ? registration.course_schedule[0]
      : registration.course_schedule
    : null;
  const course = schedule ? (Array.isArray(schedule.courses) ? schedule.courses[0] : schedule.courses) : null;
  const courseSlug = course?.slug ?? null;

  const amountMatches = Math.abs(parseFloat(transaction.total_price) - Number(payment.amount)) < 0.01;
  const isPaid = isUPaymentCaptured(transaction) && amountMatches;
  if (isUPaymentCaptured(transaction) && !amountMatches) {
    console.error(
      `reconcileUPaymentTransaction: amount mismatch for payment ${payment.id} — expected ${payment.amount}, got ${transaction.total_price}`
    );
  }

  const wasAlreadyPaid = payment.status === "paid";

  // Only ever promote a payment to "paid" — never downgrade. A
  // not-yet-captured invoice is still open (the customer may pay the link
  // UPayments texted them hours later), so it stays "pending" rather than
  // being written off as failed, which would drop it out of the recheck
  // sweep and strand a payment that later succeeds.
  if (isPaid) {
    await supabase
      .from("payments")
      .update({
        status: "paid",
        gateway_track_id: transaction.track_id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
  }

  await supabase.from("payment_transactions").insert({
    payment_id: payment.id,
    event_type: "callback",
    status: transaction.result,
    raw_response: transaction as unknown as Json,
  });

  // due_date is only set on the deferred second half of a split plan. The
  // registration is confirmed and the seat reserved at the FIRST
  // installment (due_date null) — whether that's a full payment or the
  // first half of a split. The second installment completing later just
  // marks its own payment row paid.
  if (registration && isPaid && payment.due_date === null) {
    // Deliberately not guarded by wasAlreadyPaid: re-applying "confirmed"
    // is a no-op, and running it every time means a registration left
    // stranded on "pending" by an earlier partial failure heals itself on
    // the next check instead of staying stuck forever.
    const { error: statusError } = await supabase
      .from("registrations")
      .update({ status: "confirmed" })
      .eq("id", registration.id);

    if (statusError) {
      console.error(`applyTransaction: failed to confirm registration ${registration.id}`, statusError.message);
    }

    // The seat, unlike the status, must only ever move once.
    if (!wasAlreadyPaid) {
      await supabase.rpc("decrement_seats", {
        p_schedule_id: registration.course_schedule_id,
        p_seats: registration.seats,
      });
    }
  }

  return { ok: true, isPaid, registrationId: registration?.id ?? null, courseSlug };
}

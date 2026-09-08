import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUPaymentStatusByTrackId, isUPaymentCaptured } from "@/lib/upayment";
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
  const supabase = await createServiceRoleClient();

  let transaction;
  try {
    transaction = await getUPaymentStatusByTrackId(trackId);
  } catch (err) {
    console.error("reconcileUPaymentTransaction: status lookup failed", err);
    return { ok: false, isPaid: false, registrationId: null, courseSlug: null };
  }

  // We set order.id = our payments.id when creating the invoice, and
  // UPayments echoes it back as merchant_requested_order_id.
  const paymentId = transaction.merchant_requested_order_id;
  const { data: payment } = await supabase
    .from("payments")
    .select("*, registrations(id, course_schedule_id, seats, status, course_schedule(courses(slug)))")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) {
    console.error(`reconcileUPaymentTransaction: no payment row found for order id ${paymentId}`);
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

  await supabase
    .from("payments")
    .update({
      status: isPaid ? "paid" : "failed",
      gateway_track_id: trackId,
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq("id", payment.id);

  await supabase.from("payment_transactions").insert({
    payment_id: payment.id,
    event_type: "callback",
    status: transaction.result,
    raw_response: transaction as unknown as Json,
  });

  if (registration && !wasAlreadyPaid) {
    // due_date is only set on the deferred second half of a split plan.
    // The registration is confirmed and the seat reserved once — at the
    // FIRST installment (due_date null), whether that's a full payment or
    // the first half of a split. The second installment completing later
    // just marks that payment row paid; it doesn't re-confirm or
    // re-decrement anything.
    if (payment.due_date === null) {
      await supabase
        .from("registrations")
        .update({ status: isPaid ? "confirmed" : "cancelled" })
        .eq("id", registration.id);

      if (isPaid) {
        await supabase.rpc("decrement_seats", {
          p_schedule_id: registration.course_schedule_id,
          p_seats: registration.seats,
        });
      }
    }
  }

  return { ok: true, isPaid, registrationId: registration?.id ?? null, courseSlug };
}

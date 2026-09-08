/** Server-only helpers shared by the registration API, the second-
 *  installment pay page, the gateway callback and the reminder cron.
 *  Everything here runs with the service-role client. */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createUPaymentsCharge, getUPaymentsPaymentStatus, UPAYMENTS_SUCCESS_RESULTS } from "@/lib/upayments";
import { formatMoney } from "@/lib/utils";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendWebPushToAdmins } from "@/lib/webpush";
import { secondInstallmentDueDate } from "@/lib/payments/installments";

type Db = SupabaseClient<Database>;
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export interface PaymentContext {
  payment: PaymentRow;
  registration: {
    id: string;
    course_schedule_id: string;
    full_name: string;
    email: string;
    phone: string;
    seats: number;
    amount: number;
    amount_paid: number;
    currency: string;
    status: Database["public"]["Tables"]["registrations"]["Row"]["status"];
    payment_plan: "full" | "installments";
  };
  course: { id: string; slug: string; title: string } | null;
}

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Loads a payment with its registration and course in one query. */
export async function loadPaymentContext(supabase: Db, paymentId: string): Promise<PaymentContext | null> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, registrations(id, course_schedule_id, full_name, email, phone, seats, amount, amount_paid, currency, status, payment_plan, course_schedule(courses(id, slug, title)))"
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !data) return null;

  const { registrations, ...payment } = data as unknown as PaymentRow & {
    registrations: unknown;
  };
  const registration = first(
    registrations as (PaymentContext["registration"] & { course_schedule: unknown }) | null
  );
  if (!registration) return null;
  const schedule = first(registration.course_schedule as { courses: unknown } | null);
  const course = first(schedule?.courses as PaymentContext["course"] | null);
  const { course_schedule: _omit, ...reg } = registration;
  void _omit;

  return { payment, registration: reg, course };
}

export function siteUrlFrom(request: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

/** Public page a student lands on for a specific installment. */
export function payPageUrl(siteUrl: string, paymentId: string): string {
  return `${siteUrl}/pay/${paymentId}`;
}

/** Creates a fresh UPayments hosted-checkout link for a pending payment
 *  row and stores the gateway identifiers on it. Each call mints a new
 *  order id — UPayments rejects a reused one — so retries always work. */
export async function createCheckoutLink(
  supabase: Db,
  ctx: PaymentContext,
  opts: { siteUrl: string; lang?: "en" | "ar" }
): Promise<{ link: string }> {
  const { payment, registration, course } = ctx;
  const courseTitle = course?.title ?? "Course";
  const isInstallment = payment.installments_total > 1;
  const label = isInstallment ? ` — installment ${payment.installment_no}/${payment.installments_total}` : "";
  const seatsLabel = registration.seats > 1 ? ` × ${registration.seats} seats` : "";
  const orderId = `${payment.id.slice(0, 8)}-${randomUUID().slice(0, 12)}`;

  const callbackBase = `${opts.siteUrl}/api/payments/callback?paymentRowId=${payment.id}`;

  const { link, trackId, raw } = await createUPaymentsCharge({
    customerName: registration.full_name,
    customerEmail: registration.email,
    customerPhone: registration.phone,
    customerUniqueId: registration.email.toLowerCase(),
    amount: Number(payment.amount),
    currency: payment.currency,
    orderId,
    reference: payment.id,
    description: `${courseTitle}${seatsLabel}${label}`,
    itemName: `${courseTitle}${seatsLabel}${label}`,
    language: opts.lang ?? "en",
    returnUrl: callbackBase,
    cancelUrl: `${callbackBase}&cancelled=1`,
    notificationUrl: callbackBase,
  });

  await supabase
    .from("payments")
    .update({ gateway_order_id: orderId, gateway_track_id: trackId, gateway_link: link, method: "upayments" })
    .eq("id", payment.id);
  await supabase.from("payment_transactions").insert({
    payment_id: payment.id,
    event_type: "created",
    status: "checkout_created",
    raw_response: { orderId, trackId, link, response: raw } as unknown as Json,
  });

  return { link };
}

export type VerifiedOutcome = "paid" | "failed" | "unverified";

/** Asks UPayments for the authoritative result of a track id and checks
 *  it against what we expected (our order id + amount). Never trusts the
 *  redirect/webhook query params alone. */
export async function verifyWithGateway(
  supabase: Db,
  payment: PaymentRow,
  trackId: string
): Promise<{ outcome: VerifiedOutcome; result: string; raw: Json }> {
  try {
    const status = await getUPaymentsPaymentStatus(trackId);
    const raw = status.raw as unknown as Json;

    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "status_check",
      status: status.result || "unknown",
      raw_response: raw,
    });

    const success = UPAYMENTS_SUCCESS_RESULTS.has(status.result);
    const orderMatches = !status.orderId || !payment.gateway_order_id || status.orderId === payment.gateway_order_id;
    const amountMatches = status.amount === null || Math.abs(status.amount - Number(payment.amount)) < 0.01;

    if (success && !(orderMatches && amountMatches)) {
      console.error(
        `payment verify: mismatch for payment ${payment.id} — order ${status.orderId} vs ${payment.gateway_order_id}, amount ${status.amount} vs ${payment.amount}`
      );
      return { outcome: "failed", result: `${status.result}_MISMATCH`, raw };
    }
    if (success) return { outcome: "paid", result: status.result, raw };
    if (!status.result) return { outcome: "unverified", result: "", raw };
    return { outcome: "failed", result: status.result, raw };
  } catch (err) {
    console.error("payment verify error:", err);
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "error",
      status: "status_check_failed",
      raw_response: { message: String(err), trackId },
    });
    return { outcome: "unverified", result: "", raw: { message: String(err) } };
  }
}

/** Applies a verified "paid" result: marks the payment, tops up the
 *  registration's paid total, confirms the seat on the first installment
 *  and schedules the second one. Idempotent — a repeat callback for an
 *  already-paid row changes nothing (and never double-decrements seats). */
export async function settlePaidPayment(
  supabase: Db,
  ctx: PaymentContext,
  gateway: { trackId: string | null; paymentId: string | null }
): Promise<void> {
  const { payment, registration, course } = ctx;
  if (payment.status === "paid") return;

  const now = new Date();
  await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: now.toISOString(),
      gateway_track_id: gateway.trackId ?? payment.gateway_track_id,
      gateway_payment_id: gateway.paymentId ?? payment.gateway_payment_id,
    })
    .eq("id", payment.id);

  await supabase.rpc("add_registration_paid_amount", {
    p_registration_id: registration.id,
    p_amount: Number(payment.amount),
  });

  const isFirst = payment.installment_no === 1;
  const hasSecond = payment.installments_total === 2;

  if (isFirst) {
    await supabase.from("registrations").update({ status: "confirmed" }).eq("id", registration.id);
    await supabase.rpc("decrement_seats", {
      p_schedule_id: registration.course_schedule_id,
      p_seats: registration.seats,
    });
    if (hasSecond) {
      // The 30-day clock starts from the first payment, not from
      // registration, so a student who paid a day late isn't chased early.
      await supabase
        .from("payments")
        .update({ due_date: secondInstallmentDueDate(now) })
        .eq("registration_id", registration.id)
        .eq("installment_no", 2)
        .eq("status", "pending");
    }
  }

  const courseTitle = course?.title ?? "Course";
  const money = formatMoney(Number(payment.amount), payment.currency);
  const headline = hasSecond
    ? isFirst
      ? "💳 First installment paid (50%)"
      : "✅ Second installment paid — fully paid"
    : "✅ Payment received";
  await Promise.all([
    sendTelegramNotification(
      [headline, `Course: ${courseTitle}`, `Name: ${registration.full_name}`, `Amount: ${money}`, `Phone: ${registration.phone}`].join("\n")
    ),
    sendWebPushToAdmins({
      title: headline,
      body: `${registration.full_name} · ${courseTitle} · ${money}`,
      url: "/admin/registrations",
    }),
  ]);
}

/** Applies a verified failure. A failed first installment cancels the
 *  (never-confirmed) registration; a failed second installment stays
 *  pending so the student can retry from their pay link. */
export async function settleFailedPayment(supabase: Db, ctx: PaymentContext, result: string): Promise<void> {
  const { payment, registration } = ctx;
  if (payment.status === "paid") return;

  if (payment.installment_no === 1) {
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    if (registration.status === "pending") {
      await supabase.from("registrations").update({ status: "cancelled" }).eq("id", registration.id);
    }
  } else {
    await supabase.from("payment_transactions").insert({
      payment_id: payment.id,
      event_type: "callback",
      status: `retry_allowed:${result || "unknown"}`,
      raw_response: null,
    });
  }
}

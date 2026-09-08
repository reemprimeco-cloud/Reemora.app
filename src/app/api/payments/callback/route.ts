import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  loadPaymentContext,
  settleFailedPayment,
  settlePaidPayment,
  siteUrlFrom,
  verifyWithGateway,
} from "@/lib/payments/checkout";
import { sendTelegramNotification } from "@/lib/telegram";
import type { Json } from "@/lib/supabase/database.types";

/** UPayments sends the student back here (GET, via returnUrl/cancelUrl)
 *  and also POSTs the same fields server-to-server (notificationUrl).
 *  Both paths run the same verification: the gateway's own
 *  get-payment-status is the only thing that flips a payment to paid —
 *  the query params are treated as hints. */

interface CallbackParams {
  paymentRowId: string;
  result: string;
  trackId: string;
  gatewayPaymentId: string;
  requestedOrderId: string;
  cancelled: boolean;
  raw: Record<string, string>;
}

function pick(source: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const v = source.get(key);
    if (v && v.trim()) return v.trim();
  }
  return "";
}

async function readParams(request: Request): Promise<CallbackParams> {
  const url = new URL(request.url);
  const merged = new URLSearchParams(url.searchParams);

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body)) {
          if (v !== null && v !== undefined && typeof v !== "object") merged.set(k, String(v));
        }
      } else {
        const text = await request.text();
        for (const [k, v] of new URLSearchParams(text)) merged.set(k, v);
      }
    } catch {
      // Body unreadable — fall back to query params only.
    }
  }

  return {
    paymentRowId: pick(merged, ["paymentRowId"]),
    result: pick(merged, ["result", "Result"]).toUpperCase(),
    trackId: pick(merged, ["track_id", "trackId", "TrackId"]),
    gatewayPaymentId: pick(merged, ["payment_id", "paymentId", "PaymentId"]),
    requestedOrderId: pick(merged, ["requested_order_id", "requestedOrderId", "order_id", "OrderID"]),
    cancelled: merged.get("cancelled") === "1",
    raw: Object.fromEntries(merged.entries()),
  };
}

type Outcome = "success" | "failed" | "pending";

async function processCallback(params: CallbackParams): Promise<{
  outcome: Outcome;
  redirect: { kind: "register"; slug: string; ref: string; plan: string; due: string } | { kind: "pay"; paymentId: string };
}> {
  const supabase = await createServiceRoleClient();
  const ctx = await loadPaymentContext(supabase, params.paymentRowId);
  if (!ctx) throw new Error(`payment ${params.paymentRowId} not found`);

  const { payment, registration, course } = ctx;
  const redirect =
    payment.installment_no === 1
      ? ({ kind: "register", slug: course?.slug ?? "", ref: registration.id, plan: registration.payment_plan, due: "" } as const)
      : ({ kind: "pay", paymentId: payment.id } as const);

  await supabase.from("payment_transactions").insert({
    payment_id: payment.id,
    event_type: "callback",
    status: params.cancelled ? `cancelled:${params.result || "none"}` : params.result || "none",
    raw_response: params.raw as unknown as Json,
  });

  // Already settled by an earlier callback/webhook — nothing to redo.
  if (payment.status === "paid") {
    return { outcome: "success", redirect: await withDue(redirect) };
  }

  // A cancel redirect without a track id means the student backed out
  // before the gateway created a transaction — nothing to verify.
  if (!params.trackId) {
    await settleFailedPayment(supabase, ctx, params.cancelled ? "CANCELED" : params.result);
    return { outcome: "failed", redirect };
  }

  const verified = await verifyWithGateway(supabase, payment, params.trackId);

  if (verified.outcome === "paid") {
    await settlePaidPayment(supabase, ctx, { trackId: params.trackId, paymentId: params.gatewayPaymentId || null });
    return { outcome: "success", redirect: await withDue(redirect) };
  }

  if (verified.outcome === "failed") {
    await settleFailedPayment(supabase, ctx, verified.result);
    return { outcome: "failed", redirect };
  }

  // Gateway unreachable / unrecognised response: keep the payment pending
  // and flag it for a human rather than guessing either way.
  await sendTelegramNotification(
    [
      "⚠️ Payment needs manual verification",
      `Student: ${registration.full_name} (${registration.phone})`,
      `Course: ${course?.title ?? "—"}`,
      `Payment row: ${payment.id}`,
      `Track id: ${params.trackId}`,
      `Gateway said: ${params.result || "no result param"}`,
    ].join("\n")
  );
  return { outcome: "pending", redirect };

  async function withDue<T extends { kind: string }>(r: T): Promise<T> {
    if (r.kind !== "register" || registration.payment_plan !== "installments") return r;
    const { data } = await supabase
      .from("payments")
      .select("due_date")
      .eq("registration_id", registration.id)
      .eq("installment_no", 2)
      .maybeSingle();
    return { ...r, due: data?.due_date ?? "" };
  }
}

function redirectFor(siteUrl: string, res: Awaited<ReturnType<typeof processCallback>>): string {
  const status = res.outcome;
  if (res.redirect.kind === "pay") {
    return `${siteUrl}/pay/${res.redirect.paymentId}?status=${status}`;
  }
  const q = new URLSearchParams({ status, ref: res.redirect.ref });
  if (res.redirect.plan === "installments") {
    q.set("plan", "installments");
    if (res.redirect.due) q.set("due", res.redirect.due);
  }
  return `${siteUrl}/register/${res.redirect.slug}?${q.toString()}`;
}

export async function GET(request: Request) {
  const siteUrl = siteUrlFrom(request);
  const params = await readParams(request);

  if (!params.paymentRowId) {
    return NextResponse.redirect(`${siteUrl}/courses?status=failed`);
  }

  try {
    const res = await processCallback(params);
    return NextResponse.redirect(redirectFor(siteUrl, res));
  } catch (err) {
    console.error("payment callback error:", err);
    return NextResponse.redirect(`${siteUrl}/courses?status=failed`);
  }
}

export async function POST(request: Request) {
  const params = await readParams(request);
  if (!params.paymentRowId) {
    return NextResponse.json({ ok: false, error: "Missing paymentRowId" }, { status: 400 });
  }
  try {
    const res = await processCallback(params);
    return NextResponse.json({ ok: true, outcome: res.outcome });
  } catch (err) {
    console.error("payment webhook error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

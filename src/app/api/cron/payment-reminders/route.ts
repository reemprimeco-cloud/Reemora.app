import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createUPaymentInvoice } from "@/lib/upayment";
import { formatMoney } from "@/lib/utils";
import { sendTelegramNotification } from "@/lib/telegram";
import { sendWebPushToAdmins } from "@/lib/webpush";

/** Daily job (see vercel.json) that finds the deferred second half of a
 *  50/50 split payment once its due_date arrives, generates a fresh
 *  UPayments checkout link for it (a link created 30 days earlier may
 *  have expired), and notifies the admin with a one-tap WhatsApp link —
 *  this is the "semi-auto" reminder: the system prepares everything, a
 *  human taps send, since fully automatic WhatsApp sending requires Meta
 *  Business verification. reminder_ready_at is set right after the link
 *  is generated so a payment is only ever prepped once, no matter how
 *  many times this route runs. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createServiceRoleClient();

  const { data: duePayments, error } = await supabase
    .from("payments")
    .select("*, registrations(id, full_name, phone, email, course_schedule(courses(title, slug)))")
    .eq("status", "pending")
    .not("due_date", "is", null)
    .lte("due_date", today)
    .is("reminder_ready_at", null);

  if (error) {
    console.error("payment-reminders: query failed", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let prepared = 0;
  let failed = 0;

  for (const payment of duePayments ?? []) {
    const registration = Array.isArray(payment.registrations) ? payment.registrations[0] : payment.registrations;
    if (!registration) continue;
    const schedule = Array.isArray(registration.course_schedule)
      ? registration.course_schedule[0]
      : registration.course_schedule;
    const course = schedule ? (Array.isArray(schedule.courses) ? schedule.courses[0] : schedule.courses) : null;
    if (!course) continue;

    try {
      const { checkoutUrl, invoiceId } = await createUPaymentInvoice({
        customerName: registration.full_name,
        customerEmail: registration.email,
        customerPhone: registration.phone,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.id,
        referenceId: registration.id,
        orderDescription: `${course.title} — 2nd of 2 payments`,
        returnUrl: `${siteUrl}/api/payments/callback?courseSlug=${course.slug}`,
        cancelUrl: `${siteUrl}/api/payments/callback?courseSlug=${course.slug}`,
        notificationUrl: `${siteUrl}/api/payments/upayment-webhook`,
      });

      if (!checkoutUrl) throw new Error("UPayments did not return a checkout URL.");

      await supabase
        .from("payments")
        .update({ checkout_url: checkoutUrl, gateway_invoice_id: invoiceId, reminder_ready_at: new Date().toISOString() })
        .eq("id", payment.id);

      await supabase.from("payment_transactions").insert({
        payment_id: payment.id,
        event_type: "created",
        status: "reminder_invoice_created",
        raw_response: { invoiceId, checkoutUrl },
      });

      const amountLabel = formatMoney(payment.amount, payment.currency);
      const waPhone = registration.phone.replace(/\D/g, "");
      const waText = encodeURIComponent(
        `Hi ${registration.full_name}, this is a reminder that your remaining payment of ${amountLabel} for ${course.title} is now due. Complete it securely here: ${checkoutUrl}`
      );
      const waLink = `https://wa.me/${waPhone}?text=${waText}`;

      await Promise.all([
        sendTelegramNotification(
          [
            "💳 Payment reminder ready to send",
            `Course: ${course.title}`,
            `Name: ${registration.full_name}`,
            `Amount due: ${amountLabel}`,
            `Phone: ${registration.phone}`,
            `Tap to send on WhatsApp: ${waLink}`,
          ].join("\n")
        ),
        sendWebPushToAdmins({
          title: "💳 Payment reminder ready",
          body: `${registration.full_name} — ${amountLabel} due for ${course.title}. Tap to send via WhatsApp.`,
          url: waLink,
        }),
      ]);

      prepared += 1;
    } catch (err) {
      failed += 1;
      console.error(`payment-reminders: failed to prep reminder for payment ${payment.id}`, err);
      await supabase.from("payment_transactions").insert({
        payment_id: payment.id,
        event_type: "error",
        status: "reminder_create_failed",
        raw_response: { message: String(err) },
      });
    }
  }

  return NextResponse.json({ ok: true, prepared, failed, checked: duePayments?.length ?? 0 });
}

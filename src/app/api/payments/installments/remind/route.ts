import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { sendSms, isSmsConfigured } from "@/lib/sms";
import { sendTelegramNotification } from "@/lib/telegram";
import { formatMoney, formatDate } from "@/lib/utils";
import { payPageUrl, siteUrlFrom } from "@/lib/payments/checkout";
import {
  REMINDER_LEAD_DAYS,
  REMINDER_MAX_COUNT,
  REMINDER_REPEAT_DAYS,
  addDaysIso,
} from "@/lib/payments/installments";
import type { Json } from "@/lib/supabase/database.types";

/** Second-installment reminders.
 *
 *  - GET  — invoked daily by the Vercel cron in vercel.json. Vercel sends
 *           `Authorization: Bearer $CRON_SECRET`; anything else is 401.
 *  - POST — a signed-in admin nudging one specific payment right now
 *           (`{ paymentId }`), regardless of the schedule. Bypasses the
 *           lead-time / spacing rules but still respects the hard cap.
 *
 *  Schedule: first nudge REMINDER_LEAD_DAYS before the due date, then
 *  every REMINDER_REPEAT_DAYS until paid, at most REMINDER_MAX_COUNT.
 *  Only registrations whose first installment actually cleared
 *  (status = confirmed) are chased. */

interface DueRow {
  id: string;
  amount: number;
  currency: string;
  due_date: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  registrations:
    | {
        id: string;
        full_name: string;
        phone: string;
        status: string;
        course_schedule: { courses: { title: string } | { title: string }[] | null } | { courses: { title: string } | { title: string }[] | null }[] | null;
      }
    | null;
}

function courseTitleOf(r: DueRow): string {
  const reg = r.registrations;
  const sched = Array.isArray(reg?.course_schedule) ? reg?.course_schedule[0] : reg?.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? "your course";
}

function reminderMessage(row: DueRow, link: string): string {
  const money = formatMoney(Number(row.amount), row.currency);
  const dueEn = formatDate(row.due_date, "en");
  const dueAr = formatDate(row.due_date, "ar");
  const title = courseTitleOf(row);
  const name = row.registrations?.full_name?.split(" ")[0] ?? "";
  return [
    `Reemora: Hi ${name}, a reminder that the 2nd installment of ${money} for "${title}" is due on ${dueEn}. Pay securely here: ${link}`,
    `ريمورا: مرحباً ${name}، نذكّرك بأن القسط الثاني بقيمة ${money} لدورة "${title}" مستحق بتاريخ ${dueAr}. ادفع بأمان عبر الرابط: ${link}`,
  ].join("\n\n");
}

async function sendReminder(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  row: DueRow,
  siteUrl: string
): Promise<{ id: string; ok: boolean; detail: string }> {
  const phone = row.registrations?.phone ?? "";
  const link = payPageUrl(siteUrl, row.id);
  const result = await sendSms(phone, reminderMessage(row, link));

  await supabase.from("payment_transactions").insert({
    payment_id: row.id,
    event_type: "reminder",
    status: result.ok ? `sent:${result.channel}` : `failed:${result.skipped ?? "send_error"}`,
    raw_response: { to: result.to, sid: result.sid ?? null, error: result.error ?? null, link } as unknown as Json,
  });

  if (result.ok) {
    await supabase
      .from("payments")
      .update({ reminder_count: row.reminder_count + 1, last_reminder_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  return { id: row.id, ok: result.ok, detail: result.ok ? `${result.channel} → ${result.to}` : result.error ?? result.skipped ?? "failed" };
}

const DUE_SELECT =
  "id, amount, currency, due_date, reminder_count, last_reminder_at, registrations(id, full_name, phone, status, course_schedule(courses(title)))";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, skipped: "supabase_not_configured" });

  const siteUrl = siteUrlFrom(request);
  const supabase = await createServiceRoleClient();
  const now = new Date();
  const horizon = addDaysIso(now, REMINDER_LEAD_DAYS);
  const spacingCutoff = new Date(now.getTime() - REMINDER_REPEAT_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select(DUE_SELECT)
    .eq("installment_no", 2)
    .eq("status", "pending")
    .lte("due_date", horizon)
    .lt("reminder_count", REMINDER_MAX_COUNT)
    .or(`last_reminder_at.is.null,last_reminder_at.lte.${spacingCutoff}`)
    .order("due_date", { ascending: true })
    .limit(200);

  if (error) {
    console.error("reminder query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data as unknown as DueRow[]) ?? []).filter((r) => r.registrations?.status === "confirmed");
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 });

  if (!isSmsConfigured()) {
    // Don't burn the reminder budget when nothing can actually go out —
    // just tell the admin so they can chase by hand.
    await sendTelegramNotification(
      [
        `⏰ ${rows.length} second-installment reminder${rows.length === 1 ? "" : "s"} due, but SMS isn't configured (TWILIO_*).`,
        ...rows.slice(0, 10).map((r) => `• ${r.registrations?.full_name} — ${formatMoney(Number(r.amount), r.currency)} due ${r.due_date} — ${r.registrations?.phone}`),
      ].join("\n")
    );
    return NextResponse.json({ ok: true, sent: 0, skipped: "sms_not_configured", due: rows.length });
  }

  const results = [];
  for (const row of rows) results.push(await sendReminder(supabase, row, siteUrl));
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  if (results.length) {
    await sendTelegramNotification(
      [`⏰ Installment reminders: ${sent} sent${failed ? `, ${failed} failed` : ""}`, ...results.map((r) => `• ${r.ok ? "✅" : "❌"} ${r.detail}`)].join("\n")
    );
  }

  return NextResponse.json({ ok: true, sent, failed, results });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  // Admin-only: the cookie client + is_admin() decides, not a shared secret.
  const authed = await createClient();
  const { data: userData } = await authed.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: isAdmin } = await authed.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { paymentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const supabase = await createServiceRoleClient();
  const { data } = await supabase.from("payments").select(DUE_SELECT).eq("id", paymentId).maybeSingle();
  const row = data as unknown as DueRow | null;
  if (!row) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (row.reminder_count >= REMINDER_MAX_COUNT) {
    return NextResponse.json({ error: `Reminder limit (${REMINDER_MAX_COUNT}) reached for this payment.` }, { status: 409 });
  }
  if (!isSmsConfigured()) {
    return NextResponse.json({ error: "SMS isn't configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM)." }, { status: 503 });
  }

  const result = await sendReminder(supabase, row, siteUrlFrom(request));
  if (!result.ok) return NextResponse.json({ error: result.detail }, { status: 502 });
  return NextResponse.json({ ok: true, detail: result.detail });
}

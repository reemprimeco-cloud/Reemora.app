import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";

/** Lets an admin write off the deferred second half of a split payment —
 *  e.g. a student withdraws after paying the first 50% and the remaining
 *  half will never be collected. Marks that one payment row "cancelled"
 *  (a status the schema already allows) so the reminder cron stops
 *  chasing it and the admin table shows it as settled/waived rather than
 *  perpetually "due".
 *
 *  Payments has no client-writable RLS policy by design — money rows are
 *  service-role-only — so this route checks admin auth itself (cookie
 *  session + is_admin()) before using the service-role client to write,
 *  the same boundary every other payment mutation in this app goes
 *  through. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const authed = await createClient();
  const { data: userData } = await authed.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: isAdmin } = await authed.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { paymentId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const supabase = await createServiceRoleClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, due_date")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  // due_date is only ever set on the deferred second half of a split
  // plan — refuse to cancel the first installment this way, since that
  // one is tied to seat confirmation, not just an amount owed.
  if (payment.due_date === null) {
    return NextResponse.json(
      { error: "Only the deferred second installment of a split payment can be cancelled here." },
      { status: 400 }
    );
  }
  if (payment.status !== "pending") {
    return NextResponse.json({ error: `This installment is already "${payment.status}" — nothing to cancel.` }, { status: 409 });
  }

  const { error: updateError } = await supabase.from("payments").update({ status: "cancelled" }).eq("id", paymentId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("payment_transactions").insert({
    payment_id: paymentId,
    event_type: "admin_action",
    status: "installment_cancelled",
    raw_response: { reason: reason || null, cancelledBy: userData.user.email ?? userData.user.id },
  });

  return NextResponse.json({ ok: true });
}

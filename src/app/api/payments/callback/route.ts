import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getMyFatoorahPaymentStatus } from "@/lib/myfatoorah";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("paymentId");
  const registrationId = url.searchParams.get("registrationId");
  const courseSlug = url.searchParams.get("courseSlug") || "";

  const redirectBase = `${url.origin}/register/${courseSlug}`;

  if (!paymentId || !registrationId) {
    return NextResponse.redirect(`${redirectBase}?status=failed&ref=${registrationId ?? ""}`);
  }

  try {
    const status = await getMyFatoorahPaymentStatus(paymentId);
    const isPaid = status.InvoiceStatus === "Paid";

    const supabase = await createServiceRoleClient();
    await supabase
      .from("registrations")
      .update({ payment_status: isPaid ? "paid" : "failed" })
      .eq("id", registrationId);

    return NextResponse.redirect(
      `${redirectBase}?status=${isPaid ? "success" : "failed"}&ref=${registrationId}`
    );
  } catch (err) {
    console.error("payment callback error:", err);
    return NextResponse.redirect(`${redirectBase}?status=failed&ref=${registrationId}`);
  }
}

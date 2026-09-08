import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getWebsiteSettings } from "@/lib/data/settings";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { loadPaymentContext } from "@/lib/payments/checkout";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { interpolate } from "@/lib/i18n/dictionaries";
import { formatDate, formatMoney, cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Complete Payment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Props {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ status?: string }>;
}

/** Public, link-only page for paying an outstanding installment. The URL
 *  is what the reminder SMS points at; the payment id is an unguessable
 *  UUID and the page only exposes what the student already knows about
 *  their own booking. */
export default async function PayPage({ params, searchParams }: Props) {
  const [{ paymentId }, { status }, lang, settings] = await Promise.all([params, searchParams, getLang(), getWebsiteSettings()]);
  if (!isSupabaseConfigured || !UUID_RE.test(paymentId)) notFound();

  const supabase = await createServiceRoleClient();
  const ctx = await loadPaymentContext(supabase, paymentId);
  if (!ctx) notFound();

  const dict = getDict(lang);
  const t = dict.payPage;
  const { payment, registration } = ctx;
  const isPaid = payment.status === "paid";
  const isClosed = !isPaid && (registration.status === "cancelled" || registration.status === "refunded");

  const alert =
    status === "success" || (isPaid && status !== undefined)
      ? { type: "success" as const, message: t.successAlert }
      : status === "failed"
      ? { type: "error" as const, message: t.failedAlert }
      : status === "pending"
      ? { type: "info" as const, message: t.pendingAlert }
      : status === "gateway_error"
      ? { type: "error" as const, message: t.gatewayErrorAlert }
      : null;

  return (
    <>
      <SiteHeader />
      <main className="pb-20 pt-[130px]">
        <div className="mx-auto max-w-[620px] px-6">
          {alert && (
            <div
              role="alert"
              className={cn(
                "mb-5 rounded-xl border px-4.5 py-3.5 text-sm",
                alert.type === "error" && "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
                alert.type === "info" && "border-blue-200 bg-blue-100 text-blue-600",
                alert.type === "success" && "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
              )}
            >
              {alert.message}
            </div>
          )}

          {isPaid ? (
            <div className="rounded-[22px] border border-green-200 bg-green-50 p-7 text-center dark:border-green-900 dark:bg-green-950 sm:p-10">
              <CheckCircle2 className="mx-auto mb-4 text-green-600 dark:text-green-400" size={44} aria-hidden="true" />
              <h1 className="mb-3 text-[26px] font-bold text-green-700 dark:text-green-300 sm:text-3xl">{t.paidTitle}</h1>
              <p className="mb-6 text-[15px] text-green-700 dark:text-green-300">{t.paidBody}</p>
              <Summary t={t} lang={lang} ctx={ctx} />
              <HomeLink label={t.backHome} />
            </div>
          ) : isClosed ? (
            <div className="rounded-[22px] border border-border-c bg-surface p-7 text-center sm:p-10">
              <h1 className="mb-3 text-[24px] font-bold sm:text-3xl">{t.closedTitle}</h1>
              <p className="mb-6 text-ink-soft">{t.closedBody}</p>
              <HomeLink label={t.backHome} />
            </div>
          ) : (
            <div className="rounded-[22px] border border-border-c bg-surface p-6 sm:p-10">
              <span className="mb-4 inline-flex rounded-full bg-blue-100 px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-blue-600">{t.eyebrow}</span>
              <h1 className="mb-2 text-[28px] font-bold sm:text-4xl">{t.title}</h1>
              <p className="mb-6 text-ink-soft">{t.subtitle}</p>

              <Summary t={t} lang={lang} ctx={ctx} />

              <form method="post" action={`/api/payments/pay/${payment.id}`} className="mt-6">
                <input type="hidden" name="lang" value={lang} />
                <button
                  type="submit"
                  className="min-h-[52px] w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] hover:bg-navy-800"
                >
                  {t.payNow} · {formatMoney(Number(payment.amount), payment.currency)}
                </button>
              </form>

              <div className="mt-4.5 flex flex-wrap gap-2.5">
                {[t.badgeSecure, "UPayments", t.badgeCards].map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-lg border border-border-c bg-surface-alt px-3 py-2 text-xs font-semibold text-ink-soft">
                    {b === "UPayments" && <ShieldCheck size={13} aria-hidden="true" />}
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isPaid && !isClosed && (
            <p className="mt-5 text-center text-sm">
              <Link href="/" className="font-semibold text-blue-600">{t.backHome}</Link>
            </p>
          )}
        </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

function Summary({
  t,
  lang,
  ctx,
}: {
  t: ReturnType<typeof getDict>["payPage"];
  lang: "en" | "ar";
  ctx: NonNullable<Awaited<ReturnType<typeof loadPaymentContext>>>;
}) {
  const { payment, registration, course } = ctx;
  const rows: [string, string][] = [
    [t.course, course?.title ?? "—"],
    [t.student, registration.full_name],
    [t.installment, interpolate(t.installmentOf, { n: payment.installment_no, total: payment.installments_total })],
    [t.amount, formatMoney(Number(payment.amount), payment.currency)],
  ];
  if (payment.due_date) rows.push([t.dueDate, formatDate(payment.due_date, lang)]);
  rows.push([t.statusLabel, payment.status === "paid" ? t.statusPaid : t.statusPending]);

  return (
    <div className="rounded-xl border border-border-c bg-surface-alt p-4 text-start">
      {rows.map(([label, value], i) => (
        <div key={label} className={cn("flex justify-between gap-4 py-2.5 text-sm", i < rows.length - 1 && "border-b border-border-c")}>
          <span className="text-ink-soft">{label}</span>
          <span className="font-semibold text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

function HomeLink({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-border-c bg-surface px-7 py-3 text-[15px] font-semibold text-foreground transition active:scale-[0.98] hover:border-blue-400 hover:text-blue-600"
    >
      {label}
    </Link>
  );
}

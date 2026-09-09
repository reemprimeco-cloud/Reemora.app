// UPayments (UInterfaceV2) client — Kuwait payment gateway, replacing
// MyFatoorah. Docs: https://developers.upayments.com/reference/overview
//
// Base URL defaults to the documented production host but is
// env-overridable (UPAYMENT_BASE_URL) in case that changes — same safety
// net the MyFatoorah client used for MYFATOORAH_BASE_URL.
const RAW_BASE_URL = process.env.UPAYMENT_BASE_URL || "https://uapi.upayments.com/api/v1";
const BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");

interface CreateInvoiceParams {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: string;
  /** Our own id (payment row UUID) — stored by UPayments as
   *  merchant_requested_order_id and returned in get-payment-status, so we
   *  can reconcile a webhook/redirect back to the right row. */
  orderId: string;
  /** Our own id (registration row UUID) — stored as UPayments' `reference`. */
  referenceId: string;
  orderDescription: string;
  returnUrl: string;
  cancelUrl: string;
  notificationUrl: string;
}

/** UPayments caps reference.id at 35 characters; a standard UUID is 36
 *  with its dashes. Stripping the dashes gives a 32-char hex string that's
 *  still globally unique and comfortably under every id-field limit we've
 *  hit so far. */
function shortId(id: string): string {
  return id.replace(/-/g, "");
}

function readApiKey() {
  const raw = process.env.UPAYMENT_API_KEY ?? "";
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("UPayments is not configured. Set UPAYMENT_API_KEY in your deployment environment variables.");
  }
  return {
    key: trimmed,
    diag: {
      length: trimmed.length,
      hadWhitespace: raw !== trimmed,
      startsWith: trimmed.slice(0, 2),
      endsWith: trimmed.slice(-2),
    },
  };
}

async function upaymentRequest<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const { key, diag } = readApiKey();
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.status === false) {
    // Non-secret shape hints only (length + 2-char prefix/suffix), never the
    // key itself — same diagnostic approach used for MyFatoorah so a live
    // field-mismatch can be diagnosed from logs without redeploying.
    console.error(
      `[UPayments ${path}] status=${response.status} ok=${response.ok} apiStatus=${data?.status} message=${JSON.stringify(data?.message)} body=${JSON.stringify(data)} baseUrl=${BASE_URL} keyLen=${diag.length} keyStart=${diag.startsWith} keyEnd=${diag.endsWith} keyHadWhitespace=${diag.hadWhitespace}`
    );
    throw new Error(data?.message || `UPayments ${path} failed (HTTP ${response.status})`);
  }

  return data as T;
}

interface CreateInvoiceResponse {
  status: boolean;
  message: string;
  data: {
    sms: boolean;
    email: boolean;
    link: boolean;
    url: string | null;
    invoice_id: string;
  };
}

export async function createUPaymentInvoice(params: CreateInvoiceParams) {
  const data = await upaymentRequest<CreateInvoiceResponse>("/charge", {
    method: "POST",
    body: {
      order: {
        id: shortId(params.orderId),
        reference: shortId(params.referenceId),
        description: params.orderDescription,
        currency: params.currency,
        amount: params.amount,
      },
      paymentGateway: { src: "create-invoice" },
      // "all" makes UPayments text/email the customer the payment link
      // itself (in addition to returning it to us in the response), so the
      // link goes out even if the browser redirect is missed or closed
      // early — on top of the immediate redirect we still do ourselves.
      notificationType: "all",
      language: "en",
      reference: { id: shortId(params.referenceId) },
      customer: {
        uniqueId: shortId(params.orderId),
        name: params.customerName,
        email: params.customerEmail,
        mobile: params.customerPhone,
      },
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      notificationUrl: params.notificationUrl,
    },
  });

  console.log(
    `[UPayments /charge] invoice_id=${data.data.invoice_id} sms=${data.data.sms} email=${data.data.email} link=${data.data.link} hasUrl=${Boolean(data.data.url)}`
  );

  return { checkoutUrl: data.data.url, invoiceId: data.data.invoice_id };
}

export interface UPaymentTransaction {
  order_id: string;
  payment_id: string;
  result: string; // e.g. "CAPTURED"
  payment_type: string;
  track_id: string;
  reference: string; // our reference.id
  total_price: string;
  currency_type: string;
  status: string; // e.g. "done"
  merchant_requested_order_id: string; // our order.id
  [key: string]: unknown;
}

interface PaymentStatusResponse {
  status: boolean;
  message: string;
  data: { transaction: UPaymentTransaction };
}

/** Looks up a transaction by track_id (from the return/cancel redirect
 *  query string, or the notification webhook). This is the
 *  server-to-server call we trust — never the raw redirect/webhook body
 *  itself, since either could be spoofed. */
export async function getUPaymentStatusByTrackId(trackId: string): Promise<UPaymentTransaction> {
  const data = await upaymentRequest<PaymentStatusResponse>(
    `/get-payment-status/${encodeURIComponent(trackId)}`,
    { method: "GET" }
  );
  return data.data.transaction;
}

/** Looks up a transaction by the invoice id we stored when creating the
 *  charge. Needed because a track_id only ever reaches us through the
 *  return redirect or the notification webhook — and in production both
 *  have been observed not arriving at all, leaving a genuinely paid
 *  registration stuck pending. The invoice id we always have, so this is
 *  the lookup that lets us verify payment without waiting to be told. */
export async function getUPaymentStatusByInvoiceId(invoiceId: string): Promise<UPaymentTransaction> {
  const data = await upaymentRequest<PaymentStatusResponse>(
    `/get-payment-status?invoice_id=${encodeURIComponent(invoiceId)}`,
    { method: "GET" }
  );
  return data.data.transaction;
}

/** "CAPTURED" is UPayments' success result for a completed card/KNET
 *  charge. Treated as the single source of truth for "did this transaction
 *  actually succeed" — status ("done") is a secondary/broader field we log
 *  but don't gate on, since result is the more specific settlement signal. */
export function isUPaymentCaptured(transaction: UPaymentTransaction): boolean {
  return transaction.result === "CAPTURED";
}

/** UPayments (Kuwait) hosted-checkout client. Server-only.
 *
 *  Docs: https://developers.upayments.com/reference/overview
 *  - Sandbox base URL: https://sandboxapi.upayments.com/api/v1
 *  - Live base URL:    https://apiv2api.upayments.com/api/v1
 *
 *  Flow: POST /charge → { status: true, data: { link, trackId } } → redirect
 *  the student to `link`. UPayments then redirects them back to `returnUrl`
 *  (success) or `cancelUrl` with query params: result (CAPTURED / SUCCESS /
 *  NOT CAPTURED / CANCELED / ERROR / FAILURE), track_id, payment_id,
 *  requested_order_id, tran_id, ref, auth, post_date, payment_type. The same
 *  fields are POSTed server-to-server to `notificationUrl`.
 *
 *  Redirect/webhook params are never trusted on their own — the callback
 *  route always re-verifies with GET /get-payment-status/{track_id}. */

const RAW_BASE_URL = process.env.UPAYMENTS_BASE_URL || "https://sandboxapi.upayments.com/api/v1";
const BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");

export const UPAYMENTS_SUCCESS_RESULTS = new Set(["CAPTURED", "SUCCESS"]);

export interface CreateChargeParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  /** Unique per customer — UPayments uses it to group saved cards etc. */
  customerUniqueId: string;
  amount: number;
  currency: string;
  /** Our own unguessable order id (stored as payments.gateway_order_id). */
  orderId: string;
  /** Human-readable reference shown on the UPayments dashboard. */
  reference: string;
  description: string;
  itemName: string;
  language?: "en" | "ar";
  returnUrl: string;
  cancelUrl: string;
  notificationUrl: string;
}

export interface UPaymentsChargeResult {
  link: string;
  trackId: string | null;
  raw: Record<string, unknown>;
}

function readApiKey() {
  const raw = process.env.UPAYMENTS_API_KEY ?? "";
  const key = raw.trim();
  if (!key) {
    throw new Error("UPayments is not configured. Set UPAYMENTS_API_KEY in your deployment environment variables.");
  }
  return { key, diag: { length: key.length, hadWhitespace: raw !== key, startsWith: key.slice(0, 2) } };
}

async function upaymentsRequest<T extends Record<string, unknown>>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown }
): Promise<T> {
  const { key, diag } = readApiKey();
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || data.status !== true) {
    // Greppable one-line diagnostic. Only non-secret key shape hints are
    // logged (length / 2-char prefix / whitespace flag), never the key.
    console.error(
      `[UPayments ${path}] status=${response.status} ok=${response.ok} apiStatus=${String(data?.status)} message=${JSON.stringify(data?.message)} body=${JSON.stringify(data)} baseUrl=${BASE_URL} keyLen=${diag.length} keyStart=${diag.startsWith} keyHadWhitespace=${diag.hadWhitespace}`
    );
    const message = typeof data?.message === "string" ? data.message : `UPayments ${path} failed (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Creates a hosted-checkout session and returns the URL to redirect to.
 *  `paymentGateway.src = "create-invoice"` shows every method the merchant
 *  account has enabled (KNET, cards, Apple Pay, …) on one UPayments page. */
export async function createUPaymentsCharge(params: CreateChargeParams): Promise<UPaymentsChargeResult> {
  const amount = Number(params.amount.toFixed(3));
  const data = await upaymentsRequest<{ status: boolean; data?: Record<string, unknown> }>("/charge", {
    method: "POST",
    body: {
      products: [
        { name: params.itemName, description: params.description, price: amount, quantity: 1 },
      ],
      order: {
        id: params.orderId,
        reference: params.reference,
        description: params.description,
        currency: params.currency,
        amount,
      },
      reference: { id: params.reference },
      paymentGateway: { src: "create-invoice" },
      language: params.language ?? "en",
      customer: {
        uniqueId: params.customerUniqueId,
        name: params.customerName,
        email: params.customerEmail,
        mobile: params.customerPhone ?? "",
      },
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      notificationUrl: params.notificationUrl,
      isWhitelabeled: false,
      isSaveCard: false,
    },
  });

  const payload = asRecord(data.data);
  const transaction = asRecord(payload.transactionData);
  const link =
    (typeof payload.link === "string" && payload.link) ||
    (typeof transaction.redirect_url === "string" && transaction.redirect_url) ||
    "";
  if (!link) {
    console.error(`[UPayments /charge] no checkout link in response: ${JSON.stringify(data)}`);
    throw new Error("UPayments did not return a checkout link.");
  }
  const trackId =
    (typeof payload.trackId === "string" && payload.trackId) ||
    (typeof payload.track_id === "string" && payload.track_id) ||
    (typeof transaction.track_id === "string" && transaction.track_id) ||
    null;

  return { link, trackId, raw: data as Record<string, unknown> };
}

export interface UPaymentsPaymentStatus {
  /** Normalised gateway result, upper-cased ("CAPTURED", "NOT CAPTURED", …). */
  result: string;
  /** Amount the gateway reports it captured, if present in the response. */
  amount: number | null;
  /** Our order.id as echoed by the gateway, if present. */
  orderId: string | null;
  paymentId: string | null;
  trackId: string | null;
  raw: Record<string, unknown>;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Fetches the authoritative payment result for a track id. The response
 *  shape has varied across UPayments API revisions (transaction fields
 *  sometimes nested under data.transaction), so the parser looks in the
 *  likely places rather than assuming one exact schema. */
export async function getUPaymentsPaymentStatus(trackId: string): Promise<UPaymentsPaymentStatus> {
  const data = await upaymentsRequest<{ status: boolean; data?: Record<string, unknown> }>(
    `/get-payment-status/${encodeURIComponent(trackId)}`,
    { method: "GET" }
  );

  const payload = asRecord(data.data);
  const candidates = [asRecord(payload.transaction), asRecord(payload.transactionData), payload];
  const merged: Record<string, unknown> = Object.assign({}, ...candidates.slice().reverse());

  const result = (pickString(merged, ["result", "status", "payment_status", "transaction_status"]) ?? "").toUpperCase();
  const amountRaw = pickString(merged, ["amount", "total_amount", "order_amount", "captured_amount"]);
  const amount = amountRaw !== null && !Number.isNaN(Number(amountRaw)) ? Number(amountRaw) : null;

  return {
    result,
    amount,
    orderId: pickString(merged, ["requested_order_id", "order_id", "orderId"]),
    paymentId: pickString(merged, ["payment_id", "paymentId"]),
    trackId: pickString(merged, ["track_id", "trackId"]) ?? trackId,
    raw: data as Record<string, unknown>,
  };
}

const RAW_BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com";
// Strip whitespace and any trailing slash so we can concatenate `/v2/...` reliably.
const BASE_URL = RAW_BASE_URL.trim().replace(/\/+$/, "");

interface SendPaymentParams {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  reference: string;
  itemName: string;
  callbackUrl: string;
  errorUrl: string;
}

/** Reads and validates the API key from the env, returning diagnostics we can
 *  safely log. Never logs the key itself — only its length, first/last two
 *  characters, and shape flags, which is enough to diagnose truncation,
 *  wrong-key-type, and whitespace bugs without leaking the secret. */
function readApiKey() {
  const raw = process.env.MYFATOORAH_API_KEY ?? "";
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(
      "MyFatoorah is not configured. Set MYFATOORAH_API_KEY in your deployment environment variables."
    );
  }
  return {
    key: trimmed,
    diag: {
      length: trimmed.length,
      hadWhitespace: raw !== trimmed,
      startsWith: trimmed.slice(0, 2),
      endsWith: trimmed.slice(-2),
      looksLikeJwt: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed),
    },
  };
}

async function myfatoorahRequest<T>(path: string, body: unknown): Promise<T> {
  const { key, diag } = readApiKey();
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.IsSuccess) {
    // One-line, greppable diagnostic. Key details are non-secret shape hints
    // (length + 2-char prefix/suffix + jwt-shape flag + trimming flag), not
    // the key itself. Full body is included so field-level ValidationErrors
    // are visible — MyFatoorah returns "Invalid data" as a generic Message
    // but the actual per-field reason is in data.ValidationErrors or
    // data.Data. Without this we'd have to redeploy just to see it.
    console.error(
      `[MyFatoorah ${path}] status=${response.status} ok=${response.ok} IsSuccess=${data?.IsSuccess} Message=${JSON.stringify(data?.Message)} body=${JSON.stringify(data)} baseUrl=${BASE_URL} keyLen=${diag.length} keyStart=${diag.startsWith} keyEnd=${diag.endsWith} keyJwtShape=${diag.looksLikeJwt} keyHadWhitespace=${diag.hadWhitespace}`
    );
    throw new Error(data?.Message || `MyFatoorah ${path} failed (HTTP ${response.status})`);
  }

  return data.Data as T;
}

export async function createMyFatoorahPayment(params: SendPaymentParams) {
  const data = await myfatoorahRequest<{ InvoiceURL: string; InvoiceId: number }>(
    "/v2/SendPayment",
    {
      CustomerName: params.customerName,
      CustomerEmail: params.customerEmail,
      CustomerMobile: params.customerPhone,
      InvoiceValue: params.amount,
      DisplayCurrencyIso: params.currency,
      Language: "en",
      CustomerReference: params.reference,
      InvoiceItems: [{ ItemName: params.itemName, Quantity: 1, UnitPrice: params.amount }],
      CallBackUrl: params.callbackUrl,
      ErrorUrl: params.errorUrl,
    }
  );

  return { invoiceUrl: data.InvoiceURL, invoiceId: data.InvoiceId };
}

export interface MyFatoorahPaymentStatus {
  InvoiceId: number;
  InvoiceStatus: string; // "Paid" | "Failed" | "Pending" | ...
  InvoiceValue: number;
  [key: string]: unknown;
}

export async function getMyFatoorahPaymentStatus(
  key: string,
  keyType: "PaymentId" | "InvoiceId" = "PaymentId"
): Promise<MyFatoorahPaymentStatus> {
  return myfatoorahRequest<MyFatoorahPaymentStatus>("/v2/GetPaymentStatus", {
    Key: key,
    KeyType: keyType,
  });
}

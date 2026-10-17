/** Meta Conversions API (server side). Server-only: imports node:crypto
 *  and reads META_CAPI_ACCESS_TOKEN, so never import this from a
 *  "use client" module.
 *
 *  Everything here is best-effort. A missing config, a Meta outage or a
 *  slow network must never break or delay a registration or payment, so
 *  nothing in this file throws to its caller, and callers schedule sends
 *  with `runInBackground` so the user's response goes out first. */
import { createHash } from "node:crypto";
import { after } from "next/server";

/** Pinned Graph API version. Meta supports each version for ~2 years;
 *  override with META_GRAPH_API_VERSION when you want to move up. */
const DEFAULT_GRAPH_VERSION = "v24.0";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_ATTEMPTS = 3;

export type ServerEventName =
  | "ViewContent"
  | "Lead"
  | "InitiateCheckout"
  | "CompleteRegistration"
  | "Purchase";

/** Raw (unhashed) identity and browser signals for one event. Hashing and
 *  normalisation happen in `buildUserData`, never by the caller. */
export interface MetaUserInput {
  email?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

export interface MetaServerEvent {
  eventName: ServerEventName;
  /** Same id the browser pixel used, so Meta deduplicates the pair. */
  eventId: string;
  eventSourceUrl?: string | null;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
  user: MetaUserInput;
  customData?: Record<string, unknown>;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

// ---------- normalisation + hashing ----------

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Meta's email rule: trim + lowercase, nothing else. */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** E.164 digits without "+". A bare 8-digit number is a Kuwaiti local
 *  number and gets the 965 country code; numbers typed with an
 *  international prefix ("+965…", "00965…", "+971…") keep their own. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D+/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `965${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Meta wants value with the currency's full precision; KWD has 3 decimals. */
export function toMetaValue(amount: number | string): number {
  return Math.round(Number(amount) * 1000) / 1000;
}

function buildUserData(user: MetaUserInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);
  if (email) data.em = [sha256(email)];
  if (phone) data.ph = [sha256(phone)];
  if (user.clientIp) data.client_ip_address = user.clientIp;
  if (user.userAgent) data.client_user_agent = user.userAgent;
  if (user.fbp) data.fbp = user.fbp;
  if (user.fbc) data.fbc = user.fbc;
  return data;
}

// ---------- request context ----------

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** fbc from the _fbc cookie; if the pixel hasn't set it yet, build it from
 *  an fbclid on the page URL using Meta's documented fb.1.<ms>.<fbclid>. */
function resolveFbc(cookieFbc: string | null, pageUrl: string | null | undefined): string | null {
  if (cookieFbc) return cookieFbc;
  if (!pageUrl) return null;
  try {
    const fbclid = new URL(pageUrl).searchParams.get("fbclid");
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;
  } catch {
    return null;
  }
}

/** The browser-side signals Meta matches on, read from an incoming request
 *  (IP, user agent, _fbp / _fbc cookies). `pageUrl` is the page the visitor
 *  was on, used for the fbclid fallback. */
export function metaContextFromRequest(request: Request, pageUrl?: string | null): MetaUserInput {
  const headers = request.headers;
  const cookieHeader = headers.get("cookie");
  const forwarded = headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
  return {
    clientIp,
    userAgent: headers.get("user-agent"),
    fbp: readCookie(cookieHeader, "_fbp"),
    fbc: resolveFbc(readCookie(cookieHeader, "_fbc"), pageUrl ?? headers.get("referer")),
  };
}

// ---------- sending ----------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sends one event. Retries network errors, timeouts and 5xx with
 *  backoff; 4xx (bad payload/token) is logged once and dropped. Logs carry
 *  only the event name/id and Meta's error, never user data. */
export async function sendMetaEvent(event: MetaServerEvent): Promise<void> {
  if (!isMetaCapiConfigured()) return;

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: buildUserData(event.user),
        ...(event.customData ? { custom_data: event.customData } : {}),
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
    // In the body rather than the query string so it never lands in URL logs.
    access_token: token,
  };

  const url = `https://graph.facebook.com/${version}/${encodeURIComponent(pixelId)}/events`;
  const tag = `[meta-capi ${event.eventName} ${event.eventId}]`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      });
      if (res.ok) return;

      const body = (await res.json().catch(() => null)) as { error?: { message?: string; code?: number } } | null;
      const reason = body?.error ? `code=${body.error.code} ${body.error.message}` : `HTTP ${res.status}`;
      if (res.status < 500) {
        console.error(`${tag} rejected: ${reason}`);
        return;
      }
      console.error(`${tag} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${reason}`);
    } catch (err) {
      const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : String(err);
      console.error(`${tag} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${reason}`);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(300 * 3 ** (attempt - 1));
  }
}

/** Runs `task` after the response has been sent (Next's `after`), so a
 *  slow Meta call never delays the user. Outside a request scope (tests,
 *  scripts) it just runs detached. */
export function runInBackground(task: () => Promise<void>): void {
  const safe = () => task().catch((err) => console.error("[meta-capi] background task failed:", String(err)));
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/** Fire-and-forget convenience for server code. */
export function queueMetaEvent(event: MetaServerEvent): void {
  if (!isMetaCapiConfigured()) return;
  runInBackground(() => sendMetaEvent(event));
}

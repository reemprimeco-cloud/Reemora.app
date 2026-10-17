import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isMetaCapiConfigured, metaContextFromRequest, queueMetaEvent, type ServerEventName } from "@/lib/meta-capi";

/** Server-side mirror of browser pixel events (same event_id, so Meta
 *  deduplicates the pair). Public endpoint, so it only accepts the events
 *  the browser is allowed to report. Purchase and CompleteRegistration are
 *  sent exclusively by server code that has verified them, never here. */
const ALLOWED_EVENTS = new Set<ServerEventName>(["ViewContent", "Lead", "InitiateCheckout"]);

const STRING_KEYS = ["content_name", "content_type", "content_category", "currency"] as const;
const NUMBER_KEYS = ["value", "num_items"] as const;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** Keeps only the custom_data fields we actually send, with sane types. */
function sanitizeCustomData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of STRING_KEYS) {
    const v = str(obj[key], 200);
    if (v) out[key] = v;
  }
  for (const key of NUMBER_KEYS) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  if (Array.isArray(obj.content_ids)) {
    const ids = obj.content_ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64).slice(0, 20);
    if (ids.length) out.content_ids = ids;
  }
  return out;
}

export async function POST(request: Request) {
  // Inert without config: accept and drop, so the browser never sees errors.
  if (!isMetaCapiConfigured()) return new NextResponse(null, { status: 204 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`meta-capi:${ip}`, 60, 60_000).ok) return new NextResponse(null, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const eventName = body.event_name as ServerEventName;
  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  if (!ALLOWED_EVENTS.has(eventName) || !EVENT_ID_RE.test(eventId)) {
    return new NextResponse(null, { status: 400 });
  }

  // Only report URLs on this site as the event source.
  let eventSourceUrl: string | null = null;
  const rawUrl = str(body.event_source_url, 2000);
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.host === new URL(request.url).host || parsed.host === request.headers.get("host")) eventSourceUrl = parsed.toString();
    } catch {
      // ignore malformed URL
    }
  }

  const user = body.user && typeof body.user === "object" ? (body.user as Record<string, unknown>) : {};

  queueMetaEvent({
    eventName,
    eventId,
    eventSourceUrl,
    customData: sanitizeCustomData(body.custom_data),
    user: {
      ...metaContextFromRequest(request, eventSourceUrl),
      email: str(user.email, 254),
      phone: str(user.phone, 30),
    },
  });

  return new NextResponse(null, { status: 202 });
}

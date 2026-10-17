/** Browser-side Meta Pixel helper.
 *
 *  `track()` fires the pixel event and mirrors it to our own
 *  /api/meta/capi route with the same eventID, so Meta counts the pair
 *  once (browser + Conversions API deduplication).
 *
 *  Completely inert when NEXT_PUBLIC_META_PIXEL_ID is unset: no fbq call,
 *  no network request, no error. Purchase and CompleteRegistration are not
 *  sent from here — they are server-only (see lib/meta-capi.ts). */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export type BrowserEventName = "ViewContent" | "Lead" | "InitiateCheckout";

export interface MetaCustomData {
  content_name?: string;
  content_ids?: string[];
  content_type?: "product";
  content_category?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  [key: string]: unknown;
}

export interface TrackOptions {
  /** Reuse an id instead of generating one. */
  eventID?: string;
  /** Raw identity for server-side matching. Sent only to our own API,
   *  which normalises and SHA-256 hashes it before it reaches Meta. */
  user?: { email?: string; phone?: string };
}

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function isMetaPixelEnabled(): boolean {
  return META_PIXEL_ID.length > 0;
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** KWD carries 3 decimals; keep full precision for Meta's value field. */
export function toMetaValue(amount: number | string): number {
  return Math.round(Number(amount) * 1000) / 1000;
}

/** Fires `event` on the pixel and the Conversions API. Returns the eventID
 *  used (also when the pixel is disabled, so callers never branch). */
export function track(event: BrowserEventName, params?: MetaCustomData, opts?: TrackOptions): string {
  const eventID = opts?.eventID ?? newEventId();
  if (!isMetaPixelEnabled() || typeof window === "undefined") return eventID;

  try {
    window.fbq?.("track", event, params ?? {}, { eventID });
  } catch {
    // A blocked or broken pixel script must never break the page.
  }

  try {
    const body = JSON.stringify({
      event_name: event,
      event_id: eventID,
      event_source_url: window.location.href,
      custom_data: params ?? {},
      user: opts?.user ?? {},
    });
    // keepalive lets the request finish even if the page navigates away
    // right after (e.g. redirect to the payment gateway).
    void fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Never surface tracking failures to the visitor.
  }

  return eventID;
}

/** PageView is browser-only (no Conversions API mirror). */
export function trackPageView(): void {
  if (!isMetaPixelEnabled() || typeof window === "undefined") return;
  try {
    window.fbq?.("track", "PageView");
  } catch {
    // ignore
  }
}

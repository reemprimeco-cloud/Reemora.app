import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metaContextFromRequest, normalizeEmail, normalizePhone, sendMetaEvent, toMetaValue } from "./meta-capi";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

describe("normalisation", () => {
  it("normalises email to trimmed lowercase", () => {
    expect(normalizeEmail("  Reem@Example.COM ")).toBe("reem@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
  });

  it("normalises Kuwaiti phones to E.164 digits with 965", () => {
    expect(normalizePhone("5512 2000")).toBe("96555122000");
    expect(normalizePhone("+965 5512-2000")).toBe("96555122000");
    expect(normalizePhone("00965 55122000")).toBe("96555122000");
    expect(normalizePhone("+971 50 123 4567")).toBe("971501234567");
    expect(normalizePhone("123")).toBeNull();
  });

  it("keeps KWD's three decimals", () => {
    expect(toMetaValue(125)).toBe(125);
    expect(toMetaValue("7.505")).toBe(7.505);
    expect(toMetaValue(0.1 + 0.2)).toBe(0.3);
  });
});

describe("metaContextFromRequest", () => {
  it("reads ip, user agent and the _fbp/_fbc cookies", () => {
    const req = new Request("https://reemora.app/api/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1", "user-agent": "UA", cookie: "_fbp=fb.1.1.111; _fbc=fb.1.2.abc" },
    });
    expect(metaContextFromRequest(req)).toEqual({ clientIp: "1.2.3.4", userAgent: "UA", fbp: "fb.1.1.111", fbc: "fb.1.2.abc" });
  });

  it("builds fbc from fbclid when the cookie is missing", () => {
    const req = new Request("https://reemora.app/api/x");
    const ctx = metaContextFromRequest(req, "https://reemora.app/courses/x?fbclid=CLICK123");
    expect(ctx.fbc).toMatch(/^fb\.1\.\d+\.CLICK123$/);
  });
});

describe("sendMetaEvent", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456");
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "secret-token");
    vi.stubEnv("META_TEST_EVENT_CODE", "TEST42");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const event = {
    eventName: "Purchase" as const,
    eventId: "purchase_pay-1",
    eventSourceUrl: "https://reemora.app/register/x",
    user: { email: " A@B.com ", phone: "55122000", clientIp: "1.2.3.4", userAgent: "UA", fbp: "fbp", fbc: "fbc" },
    customData: { value: 125, currency: "KWD" },
  };

  it("posts hashed identity, the event id and the test code; token stays out of the URL", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await sendMetaEvent(event);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v24.0/123456/events");
    const body = JSON.parse(init.body);
    expect(body.access_token).toBe("secret-token");
    expect(body.test_event_code).toBe("TEST42");
    const [e] = body.data;
    expect(e).toMatchObject({ event_name: "Purchase", event_id: "purchase_pay-1", action_source: "website" });
    expect(e.user_data.em).toEqual([sha("a@b.com")]);
    expect(e.user_data.ph).toEqual([sha("96555122000")]);
    expect(JSON.stringify(body)).not.toContain("a@b.com");
  });

  it("retries 5xx with backoff, then gives up without throwing", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const done = sendMetaEvent(event);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 4xx rejection", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: 190, message: "bad token" } }), { status: 400 }));
    await sendMetaEvent(event);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when not configured", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    await sendMetaEvent(event);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

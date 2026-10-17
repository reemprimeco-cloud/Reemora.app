import { beforeEach, describe, expect, it, vi } from "vitest";

/** Purchase must reach Meta exactly once: on the transition into "paid",
 *  never again when the callback is refreshed or the webhook re-delivers. */

const queued: unknown[] = [];
vi.mock("@/lib/meta-capi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/meta-capi")>("@/lib/meta-capi");
  return {
    ...actual,
    isMetaCapiConfigured: () => true,
    runInBackground: (task: () => Promise<void>) => queued.push(task),
    sendMetaEvent: vi.fn(async () => undefined),
  };
});

let paymentRow: Record<string, unknown> | null = null;
function chain(table: string) {
  const api: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "not", "order", "limit"]) api[m] = () => api;
  api.maybeSingle = async () => ({ data: table === "payments" ? paymentRow : null, error: null });
  api.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
  return api;
}
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: async () => ({
    from: (table: string) => ({ select: () => chain(table), update: () => chain(table), insert: () => chain(table) }),
    rpc: async () => ({ data: null, error: null }),
  }),
}));

const transaction = { result: "CAPTURED", status: "done", track_id: "trk-1", total_price: "125.000", merchant_requested_order_id: "pay-1" };
vi.mock("@/lib/upayment", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upayment")>("@/lib/upayment");
  return { ...actual, getUPaymentStatusByTrackId: async () => transaction };
});

import { reconcileUPaymentTransaction } from "./payment-reconciliation";
import { sendMetaEvent } from "@/lib/meta-capi";

const registration = {
  id: "reg-1",
  course_schedule_id: "sched-1",
  seats: 1,
  status: "pending",
  email: "a@b.com",
  phone: "55122000",
  course_schedule: { courses: { id: "course-1", slug: "nocode-ai-apps", title: "No-Code AI" } },
};

beforeEach(() => {
  queued.length = 0;
  vi.mocked(sendMetaEvent).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("Meta Purchase on payment confirmation", () => {
  it("queues one server-side Purchase with value, currency, ids and a deterministic event id", async () => {
    paymentRow = { id: "pay-1", amount: 125, currency: "KWD", status: "pending", due_date: null, registrations: registration };
    await reconcileUPaymentTransaction("trk-1");

    expect(queued).toHaveLength(1);
    await (queued[0] as () => Promise<void>)();
    expect(sendMetaEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendMetaEvent).mock.calls[0][0]).toMatchObject({
      eventName: "Purchase",
      eventId: "purchase_pay-1",
      user: { email: "a@b.com", phone: "55122000" },
      customData: { value: 125, currency: "KWD", content_ids: ["course-1"], order_id: "reg-1", content_type: "product" },
    });
  });

  it("does not fire again when the payment was already paid (refresh / webhook redelivery)", async () => {
    paymentRow = { id: "pay-1", amount: 125, currency: "KWD", status: "paid", due_date: null, registrations: registration };
    await reconcileUPaymentTransaction("trk-1");
    expect(queued).toHaveLength(0);
  });

  it("does not fire when the captured amount does not match what was billed", async () => {
    paymentRow = { id: "pay-1", amount: 999, currency: "KWD", status: "pending", due_date: null, registrations: registration };
    await reconcileUPaymentTransaction("trk-1");
    expect(queued).toHaveLength(0);
  });
});

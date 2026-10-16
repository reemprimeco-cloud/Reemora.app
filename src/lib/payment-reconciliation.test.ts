import { beforeEach, describe, expect, it, vi } from "vitest";

/** A tiny recorder that looks enough like supabase-js for applyTransaction:
 *  every chained call resolves to the configured row, and writes are
 *  captured so the test can assert exactly what was changed. */
function makeFakeSupabase(paymentRow: Record<string, unknown> | null) {
  const writes: { table: string; op: string; values: unknown }[] = [];
  const rpcs: { fn: string; args: unknown }[] = [];
  function chain(table: string, op: string, values?: unknown) {
    if (op !== "select") writes.push({ table, op, values });
    const api: Record<string, unknown> = {};
    const self = () => api;
    for (const m of ["select", "eq", "is", "not", "order", "limit"]) api[m] = self;
    api.maybeSingle = async () => ({ data: table === "payments" ? paymentRow : null, error: null });
    api.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
    return api;
  }
  const client = {
    from: (table: string) => ({
      select: () => chain(table, "select"),
      update: (values: unknown) => chain(table, "update", values),
      insert: (values: unknown) => chain(table, "insert", values),
    }),
    rpc: async (fn: string, args: unknown) => {
      rpcs.push({ fn, args });
      return { data: null, error: null };
    },
  };
  return { client, writes, rpcs };
}

const fake = { current: makeFakeSupabase(null) };
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: async () => fake.current.client,
}));

const upayment = { transaction: {} as Record<string, unknown> };
vi.mock("@/lib/upayment", async () => {
  const actual = await vi.importActual<typeof import("@/lib/upayment")>("@/lib/upayment");
  return {
    ...actual,
    getUPaymentStatusByTrackId: async () => upayment.transaction,
    getUPaymentStatusByInvoiceId: async () => upayment.transaction,
  };
});

import { reconcileUPaymentTransaction } from "./payment-reconciliation";

const registration = { id: "reg-1", course_schedule_id: "sched-1", seats: 1, status: "pending", course_schedule: { courses: { slug: "ai-app-bootcamp" } } };
const basePayment = { id: "pay-1", amount: 450, status: "pending", due_date: null, registrations: registration };
const captured = { result: "CAPTURED", status: "done", track_id: "trk-1", total_price: "450.000", merchant_requested_order_id: "pay-1" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("reconcileUPaymentTransaction", () => {
  it("confirms the registration and takes the seat once when the gateway amount matches", async () => {
    fake.current = makeFakeSupabase({ ...basePayment });
    upayment.transaction = { ...captured };
    const result = await reconcileUPaymentTransaction("trk-1");

    expect(result).toEqual({ ok: true, isPaid: true, registrationId: "reg-1", courseSlug: "ai-app-bootcamp" });
    const paid = fake.current.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(paid?.values).toMatchObject({ status: "paid", gateway_track_id: "trk-1" });
    expect(fake.current.writes.find((w) => w.table === "registrations")?.values).toEqual({ status: "confirmed" });
    expect(fake.current.rpcs).toEqual([{ fn: "decrement_seats", args: { p_schedule_id: "sched-1", p_seats: 1 } }]);
  });

  it("refuses a captured charge whose amount does not match what we billed", async () => {
    fake.current = makeFakeSupabase({ ...basePayment });
    upayment.transaction = { ...captured, total_price: "1.000" };
    const result = await reconcileUPaymentTransaction("trk-1");

    expect(result.isPaid).toBe(false);
    expect(fake.current.writes.some((w) => w.table === "payments" && w.op === "update")).toBe(false);
    expect(fake.current.writes.some((w) => w.table === "registrations")).toBe(false);
    expect(fake.current.rpcs).toHaveLength(0);
    // The attempt is still recorded in the audit table.
    expect(fake.current.writes.some((w) => w.table === "payment_transactions" && w.op === "insert")).toBe(true);
  });

  it("never downgrades or double-charges: a second callback for a paid row keeps the seat count", async () => {
    fake.current = makeFakeSupabase({ ...basePayment, status: "paid" });
    upayment.transaction = { ...captured };
    const result = await reconcileUPaymentTransaction("trk-1");

    expect(result.isPaid).toBe(true);
    expect(fake.current.rpcs).toHaveLength(0);
  });

  it("leaves an uncaptured invoice pending instead of failing it", async () => {
    fake.current = makeFakeSupabase({ ...basePayment });
    upayment.transaction = { ...captured, result: "NOT CAPTURED" };
    const result = await reconcileUPaymentTransaction("trk-1");

    expect(result.isPaid).toBe(false);
    expect(fake.current.writes.some((w) => w.table === "payments" && w.op === "update")).toBe(false);
  });

  it("does not trust a track id that maps to no payment row", async () => {
    fake.current = makeFakeSupabase(null);
    upayment.transaction = { ...captured, merchant_requested_order_id: "pay-unknown" };
    const result = await reconcileUPaymentTransaction("trk-1");
    expect(result.ok).toBe(false);
    expect(fake.current.writes).toHaveLength(0);
  });
});

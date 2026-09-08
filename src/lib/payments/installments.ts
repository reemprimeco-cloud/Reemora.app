/** Two-installment plan maths, shared by the register form (live preview)
 *  and the payment API (authoritative). Pure — safe to import client-side. */

export type PaymentPlan = "full" | "installments";

export const INSTALLMENT_SPLIT = 0.5;
/** Days after the first installment is paid until the second is due. */
export const SECOND_INSTALLMENT_DAYS = 30;
/** Start nudging a few days before the due date, then every few days
 *  after it, up to a hard cap so nobody is spammed forever. */
export const REMINDER_LEAD_DAYS = 3;
export const REMINDER_REPEAT_DAYS = 3;
export const REMINDER_MAX_COUNT = 5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Splits a total 50/50. The second installment absorbs any rounding
 *  remainder so the two always add up to exactly `total`. */
export function splitInstallments(total: number): { first: number; second: number } {
  const first = round2(total * INSTALLMENT_SPLIT);
  const second = round2(total - first);
  return { first, second };
}

/** ISO date (YYYY-MM-DD) `days` after `from`. */
export function addDaysIso(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function secondInstallmentDueDate(from: Date = new Date()): string {
  return addDaysIso(from, SECOND_INSTALLMENT_DAYS);
}

export function parsePaymentPlan(value: unknown): PaymentPlan {
  return value === "installments" ? "installments" : "full";
}

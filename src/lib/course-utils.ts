import type { CourseSchedule, CourseWithRelations } from "@/lib/types";

/** 5% off the entire order when buying 2 or more seats. Returns
 *  { subtotal, discount, total } rounded to 2dp. Shared between the
 *  register form (live preview) and the payment API (authoritative). */
export const MULTI_SEAT_DISCOUNT_RATE = 0.05;
export const MULTI_SEAT_DISCOUNT_THRESHOLD = 2;

export function computeOrderTotal(pricePerSeat: number, seats: number) {
  const clamped = Math.max(1, Math.floor(seats));
  const subtotal = round2(pricePerSeat * clamped);
  const discount = clamped >= MULTI_SEAT_DISCOUNT_THRESHOLD ? round2(subtotal * MULTI_SEAT_DISCOUNT_RATE) : 0;
  const total = round2(subtotal - discount);
  return { subtotal, discount, total };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Splits a total into two installments: half now, half later. The second
 *  half absorbs any rounding remainder so the two always sum exactly to
 *  `total` (e.g. 15.01 -> 7.50 + 7.51, never 7.51 rounding twice). */
export function computeSplitPayment(total: number) {
  const dueNow = round2(total / 2);
  const dueLater = round2(total - dueNow);
  return { dueNow, dueLater };
}

/** One attendee taking a seat in a cohort. Stored as JSONB on
 *  registrations.attendees. First entry is always the booker; entries
 *  2..N are extra attendees added at checkout. */
export interface Attendee {
  full_name: string;
  email: string;
  phone: string;
}

/** Human-readable duration ("2 days · 4 hours" / "3 hours" / "1 day").
 *  Falls back to "TBA" when neither field is set. */
export function formatDuration(
  days: number,
  hours: number,
  labels: { day: string; days: string; hour: string; hours: string; tba: string }
): string {
  const d = Math.max(0, Math.floor(days || 0));
  const h = Math.max(0, Math.floor(hours || 0));
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} ${d === 1 ? labels.day : labels.days}`);
  if (h > 0) parts.push(`${h} ${h === 1 ? labels.hour : labels.hours}`);
  return parts.length ? parts.join(" · ") : labels.tba;
}

/** The cohort to show/register for by default: nearest upcoming, else the first schedule.
 *  Pure and dependency-free so it's safe to import from client components. */
export function primarySchedule(course: CourseWithRelations): CourseSchedule | null {
  const upcoming = course.schedules.find((s) => s.status === "upcoming");
  return upcoming ?? course.schedules[0] ?? null;
}

/** Slugs that have a matching hand-drawn placeholder illustration in /public/images/courses. */
const ILLUSTRATED_SLUGS = new Set(["ai-app-bootcamp", "prompt-engineering", "ai-agents", "nocode-ai-apps"]);

/** Resolves a safe image for a course card: the uploaded image, a known
 *  illustration, or the generic placeholder — never a slug-guessed path
 *  that might 404 for courses created without an image upload. */
export function courseImageSrc(course: { image_url: string | null; slug: string }): string {
  if (course.image_url) return course.image_url;
  if (ILLUSTRATED_SLUGS.has(course.slug)) return `/images/courses/${course.slug}.svg`;
  return "/images/courses/placeholder.svg";
}

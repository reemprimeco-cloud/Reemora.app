import type { CourseSchedule, CourseWithRelations } from "@/lib/types";

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

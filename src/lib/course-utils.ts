import type { CourseSchedule, CourseWithRelations } from "@/lib/types";

/** The cohort to show/register for by default: nearest upcoming, else the first schedule.
 *  Pure and dependency-free so it's safe to import from client components. */
export function primarySchedule(course: CourseWithRelations): CourseSchedule | null {
  const upcoming = course.schedules.find((s) => s.status === "upcoming");
  return upcoming ?? course.schedules[0] ?? null;
}

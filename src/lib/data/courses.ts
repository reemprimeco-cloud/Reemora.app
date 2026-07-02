import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { SEED_COURSES, isSupabaseConfigured } from "@/lib/data/seed-courses";
import { toOne, toMany } from "@/lib/data/relations";
import type { Course, CourseCategory, CourseSchedule, CourseWithRelations, Instructor } from "@/lib/types";

const COURSE_SELECT = "*, category:course_categories(*), instructor:instructors(*), schedules:course_schedule(*)";

type RawCourseRow = Course & {
  category: CourseCategory | CourseCategory[] | null;
  instructor: Instructor | Instructor[] | null;
  schedules: CourseSchedule | CourseSchedule[] | null;
};

function shapeCourse(row: RawCourseRow): CourseWithRelations {
  return {
    ...row,
    category: toOne(row.category),
    instructor: toOne(row.instructor),
    schedules: toMany(row.schedules).sort((a, b) =>
      (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999")
    ),
  };
}

export async function getCourses(): Promise<CourseWithRelations[]> {
  if (!isSupabaseConfigured) return SEED_COURSES;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getCourses:", error.message);
    return SEED_COURSES;
  }
  return (data as unknown as RawCourseRow[]).map(shapeCourse);
}

/** Admin-only: includes unpublished/draft courses. Relies on the caller
 *  being an authenticated admin — RLS ("Admins can view all courses")
 *  enforces this regardless. */
export async function getAllCoursesForAdmin(): Promise<CourseWithRelations[]> {
  if (!isSupabaseConfigured) return SEED_COURSES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getAllCoursesForAdmin:", error.message);
    return SEED_COURSES;
  }
  return (data as unknown as RawCourseRow[]).map(shapeCourse);
}

export async function getCourseBySlug(slug: string): Promise<CourseWithRelations | null> {
  if (!isSupabaseConfigured) {
    return SEED_COURSES.find((c) => c.slug === slug) ?? null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getCourseBySlug:", error.message);
    return SEED_COURSES.find((c) => c.slug === slug) ?? null;
  }
  return data ? shapeCourse(data as unknown as RawCourseRow) : null;
}

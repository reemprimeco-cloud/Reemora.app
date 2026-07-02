import { createClient } from "@/lib/supabase/server";
import { SEED_COURSES, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { Course } from "@/lib/types";

export async function getCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured) return SEED_COURSES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("getCourses:", error.message);
    return SEED_COURSES;
  }
  return data as Course[];
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  if (!isSupabaseConfigured) {
    return SEED_COURSES.find((c) => c.slug === slug) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getCourseBySlug:", error.message);
    return null;
  }
  return data as Course | null;
}

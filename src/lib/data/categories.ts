import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { CourseCategory } from "@/lib/types";

const SEED_CATEGORIES: CourseCategory[] = [
  { id: "seed-cat-ai-development", name: "AI Development", slug: "ai-development", description: null, display_order: 1, created_at: new Date().toISOString() },
  { id: "seed-cat-ai-skills", name: "AI Skills", slug: "ai-skills", description: null, display_order: 2, created_at: new Date().toISOString() },
  { id: "seed-cat-no-code", name: "No-Code", slug: "no-code", description: null, display_order: 3, created_at: new Date().toISOString() },
];

export async function getCategories(): Promise<CourseCategory[]> {
  if (!isSupabaseConfigured) return SEED_CATEGORIES;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("course_categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getCategories:", error.message);
    return SEED_CATEGORIES;
  }
  return data ?? SEED_CATEGORIES;
}

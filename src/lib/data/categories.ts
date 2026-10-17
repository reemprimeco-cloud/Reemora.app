import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { CourseCategory } from "@/lib/types";
import { localizeRow, CATEGORY_FIELDS } from "@/lib/i18n/localize";
import type { Lang } from "@/lib/i18n/dictionaries";

const SEED_CATEGORIES: CourseCategory[] = [
  { id: "seed-cat-ai-development", name: "AI Development", name_ar: null, slug: "ai-development", description: null, display_order: 1, created_at: new Date().toISOString() },
  { id: "seed-cat-ai-skills", name: "AI Skills", name_ar: null, slug: "ai-skills", description: null, display_order: 2, created_at: new Date().toISOString() },
  { id: "seed-cat-no-code", name: "No-Code", name_ar: null, slug: "no-code", description: null, display_order: 3, created_at: new Date().toISOString() },
];

export async function getCategories(lang: Lang = "en"): Promise<CourseCategory[]> {
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
  return (data ?? SEED_CATEGORIES).map((c) => localizeRow(c, lang, CATEGORY_FIELDS));
}

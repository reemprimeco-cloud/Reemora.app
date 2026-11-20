import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { Database } from "@/lib/supabase/database.types";
import { localizeRow, LIBRARY_FIELDS } from "@/lib/i18n/localize";
import type { Lang } from "@/lib/i18n/dictionaries";

export type LibraryItem = Database["public"]["Tables"]["library_items"]["Row"];

/** Published guides for /library, in the visitor's language. */
export async function getLibraryItems(lang: Lang = "en"): Promise<LibraryItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getLibraryItems:", error.message);
    return [];
  }
  return (data ?? []).map((item) => localizeRow(item, lang, LIBRARY_FIELDS));
}

export async function getLibraryItemBySlug(slug: string): Promise<LibraryItem | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.from("library_items").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  return data ?? null;
}

/** Admin: every item, published or not. */
export async function getAllLibraryItemsForAdmin(): Promise<LibraryItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("library_items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) {
    console.error("getAllLibraryItemsForAdmin:", error.message);
    return [];
  }
  return data ?? [];
}

import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { SEED_PORTFOLIO, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { PortfolioItem } from "@/lib/types";
import { localizeRow, PORTFOLIO_FIELDS } from "@/lib/i18n/localize";
import type { Lang } from "@/lib/i18n/dictionaries";

export async function getPortfolioItems(lang: Lang = "en"): Promise<PortfolioItem[]> {
  if (!isSupabaseConfigured) return SEED_PORTFOLIO;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("portfolio")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getPortfolioItems:", error.message);
    return SEED_PORTFOLIO;
  }
  return (data ?? []).map((item) => localizeRow(item, lang, PORTFOLIO_FIELDS));
}

/** Admin-only: includes unpublished items too. */
export async function getAllPortfolioItemsForAdmin(): Promise<PortfolioItem[]> {
  if (!isSupabaseConfigured) return SEED_PORTFOLIO;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getAllPortfolioItemsForAdmin:", error.message);
    return [];
  }
  return data ?? [];
}

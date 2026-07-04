import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { SEED_PORTFOLIO, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { PortfolioItem } from "@/lib/types";

export async function getPortfolioItems(): Promise<PortfolioItem[]> {
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
  return data ?? [];
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

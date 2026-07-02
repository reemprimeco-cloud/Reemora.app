import { createPublicClient } from "@/lib/supabase/public";
import { SEED_SETTINGS, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { WebsiteSettings } from "@/lib/types";

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  if (!isSupabaseConfigured) return SEED_SETTINGS;

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("website_settings").select("key, value");

  if (error || !data) {
    if (error) console.error("getWebsiteSettings:", error.message);
    return SEED_SETTINGS;
  }

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
  return { ...SEED_SETTINGS, ...map } as WebsiteSettings;
}

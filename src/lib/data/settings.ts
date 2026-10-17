import { createPublicClient } from "@/lib/supabase/public";
import { SEED_SETTINGS, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { WebsiteSettings } from "@/lib/types";
import type { Lang } from "@/lib/i18n/dictionaries";

export async function getWebsiteSettings(lang: Lang = "en"): Promise<WebsiteSettings> {
  if (!isSupabaseConfigured) return localizeSettings(SEED_SETTINGS, lang);

  const supabase = createPublicClient();
  const { data, error } = await supabase.from("website_settings").select("key, value");

  if (error || !data) {
    if (error) console.error("getWebsiteSettings:", error.message);
    return localizeSettings(SEED_SETTINGS, lang);
  }

  const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
  return localizeSettings({ ...SEED_SETTINGS, ...map } as WebsiteSettings, lang);
}

/** The Arabic tagline and address replace the originals in Arabic mode when filled. */
function localizeSettings(settings: WebsiteSettings, lang: Lang): WebsiteSettings {
  if (lang !== "ar") return settings;
  return {
    ...settings,
    tagline: settings.tagline_ar?.trim() ? settings.tagline_ar : settings.tagline,
    address: settings.address_ar?.trim() ? settings.address_ar : settings.address,
  };
}

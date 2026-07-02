import { createPublicClient } from "@/lib/supabase/public";
import { SEED_TESTIMONIALS, isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { Testimonial } from "@/lib/types";

export async function getTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return SEED_TESTIMONIALS;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getTestimonials:", error.message);
    return SEED_TESTIMONIALS;
  }
  return data ?? SEED_TESTIMONIALS;
}

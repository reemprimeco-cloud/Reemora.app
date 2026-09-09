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

/** Approved feedback submitted for one specific course (via the shared
 *  feedback QR code), for display on that course's own detail page.
 *  Empty (not the generic seed list) when Supabase isn't configured or
 *  there's simply no approved feedback yet — the caller hides the
 *  section entirely rather than showing unrelated seed testimonials. */
export async function getTestimonialsForCourse(courseId: string): Promise<Testimonial[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_published", true)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTestimonialsForCourse:", error.message);
    return [];
  }
  return data ?? [];
}

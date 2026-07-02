import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { SEED_TESTIMONIALS } from "@/lib/data/seed-courses";
import { TestimonialManager } from "@/components/admin/testimonial-manager";
import type { Testimonial } from "@/lib/types";

export default async function AdminTestimonialsPage() {
  let testimonials: Testimonial[] = SEED_TESTIMONIALS;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("testimonials").select("*").order("display_order", { ascending: true });
    testimonials = data ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Testimonials</h1>
      <TestimonialManager initialTestimonials={testimonials} />
    </div>
  );
}

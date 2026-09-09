import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { SEED_TESTIMONIALS } from "@/lib/data/seed-courses";
import { getCourses } from "@/lib/data/courses";
import { TestimonialManager } from "@/components/admin/testimonial-manager";
import type { Testimonial } from "@/lib/types";

export const metadata: Metadata = { title: "Testimonials" };

export default async function AdminTestimonialsPage() {
  let testimonials: Testimonial[] = SEED_TESTIMONIALS;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reemora.app";
  const courses = await getCourses();

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.from("testimonials").select("*").order("display_order", { ascending: true });
    testimonials = data ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Testimonials</h1>
      <TestimonialManager
        initialTestimonials={testimonials}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        feedbackUrl={`${siteUrl}/feedback`}
      />
    </div>
  );
}

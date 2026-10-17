import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { getCourses } from "@/lib/data/courses";
import { getWebsiteSettings } from "@/lib/data/settings";
import { InquiryInbox } from "@/components/admin/inquiry-inbox";
import type { AnnounceCourse } from "@/lib/admin/mail";
import type { CourseInquiry } from "@/lib/types";

export const metadata: Metadata = { title: "Course Inquiries" };

type Row = CourseInquiry & { courses?: AnnounceCourse | AnnounceCourse[] | null };

export default async function AdminInquiriesPage() {
  let inquiries: Row[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.reemora.app";
  const [courses, settings] = await Promise.all([getCourses(), getWebsiteSettings()]);
  const allCourses: AnnounceCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    short_description: c.short_description,
  }));

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("course_inquiries")
      .select("*, courses(id, title, slug, short_description)")
      .order("created_at", { ascending: false });
    inquiries = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Course Inquiries</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Soft leads — people who filled the &ldquo;Ask a Question / Reserve Interest&rdquo; form on a course detail page. No payment collected. When a course opens, pick it above the list and tap Email all to tell everyone who asked about it; each row also has WhatsApp, Call and Reply.
      </p>
      <InquiryInbox initialInquiries={inquiries} allCourses={allCourses} siteUrl={siteUrl} adminEmail={settings.contact_email} />
    </div>
  );
}

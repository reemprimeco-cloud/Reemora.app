import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { InquiryInbox } from "@/components/admin/inquiry-inbox";
import type { CourseInquiry } from "@/lib/types";

export const metadata: Metadata = { title: "Course Inquiries" };

type Row = CourseInquiry & { courses?: { title: string } | { title: string }[] | null };

export default async function AdminInquiriesPage() {
  let inquiries: Row[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("course_inquiries")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    inquiries = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Course Inquiries</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Soft leads — people who filled the &ldquo;Ask a Question / Reserve Interest&rdquo; form on a course detail page. No payment collected; follow up by email or phone.
      </p>
      <InquiryInbox initialInquiries={inquiries} />
    </div>
  );
}

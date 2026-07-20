import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { WaitlistInbox } from "@/components/admin/waitlist-inbox";
import type { CourseWaitlistEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Waitlist" };

type Row = CourseWaitlistEntry & { courses?: { title: string } | { title: string }[] | null };

export default async function AdminWaitlistPage() {
  let entries: Row[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("course_waitlist")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    entries = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Waitlist</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Visitors who tried to register for a sold-out cohort and asked to be notified. Call or WhatsApp them when a seat frees up, then mark them notified.
      </p>
      <WaitlistInbox initialEntries={entries} />
    </div>
  );
}

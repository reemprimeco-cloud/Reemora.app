import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { getAllCoursesForAdmin } from "@/lib/data/courses";
import { ArchiveManager, type ArchivableCohort } from "@/components/admin/archive-manager";
import type { CourseArchiveEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Course Archive" };
export const dynamic = "force-dynamic";

export default async function AdminArchivePage() {
  let entries: CourseArchiveEntry[] = [];
  let cohorts: ArchivableCohort[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: archiveRows }, courses] = await Promise.all([
      supabase.from("course_archive").select("*").order("start_date", { ascending: false, nullsFirst: false }),
      getAllCoursesForAdmin(),
    ]);

    entries = archiveRows ?? [];

    // Every cohort is offerable — a run can be archived whenever it's
    // finished, and the same cohort can be archived again after it has been
    // reused for new dates (that's the whole point: one archive row per run).
    cohorts = courses.flatMap((course) =>
      course.schedules.map((s) => ({
        id: s.id,
        courseId: course.id,
        courseTitle: course.title,
        startDate: s.start_date,
        endDate: s.end_date,
        sessionDays: s.session_days,
        sessionTime: s.session_time,
        location: s.location,
        seatsTotal: s.seats_total,
        status: s.status,
      }))
    );
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Course Archive</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        A record of every course run you&apos;ve delivered — its dates, session days, and who registered. Archive a
        cohort <strong>before</strong> you reuse the course with new dates: the archive keeps its own copy of the
        dates and participant list, so changing the schedule afterwards never erases the history.
      </p>
      <ArchiveManager initialEntries={entries} cohorts={cohorts} />
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { getCourses } from "@/lib/data/courses";
import { ReservationInbox, type ReservationCourse } from "@/components/admin/reservation-inbox";
import type { SeatReservation } from "@/lib/types";

export const metadata: Metadata = { title: "Seat Reservations" };

type Row = SeatReservation & { courses?: ReservationCourse | ReservationCourse[] | null };

export default async function AdminReservationsPage() {
  let reservations: Row[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reemora.app";
  const courses = await getCourses();
  const allCourses: ReservationCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    short_description: c.short_description,
  }));

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("seat_reservations")
      .select("*, courses(id, title, slug, short_description)")
      .order("created_at", { ascending: false });
    reservations = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Seat Reservations</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Leads from the &ldquo;Reserve Your Seat&rdquo; hero form — visitors who shared their interest, background, and (optionally) which course they want to join. Tap WhatsApp / Call to reach them, pick the course you want to recommend, and Reply opens a pre-filled email for that course.
      </p>
      <ReservationInbox initialReservations={reservations} allCourses={allCourses} siteUrl={siteUrl} />
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { ReservationInbox } from "@/components/admin/reservation-inbox";
import type { SeatReservation } from "@/lib/types";

export const metadata: Metadata = { title: "Seat Reservations" };

type Row = SeatReservation & { courses?: { title: string } | { title: string }[] | null };

export default async function AdminReservationsPage() {
  let reservations: Row[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("seat_reservations")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    reservations = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Seat Reservations</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Leads from the &ldquo;Reserve Your Seat&rdquo; hero form — visitors who shared their interest, background, and (optionally) which course they want to join. No payment collected; follow up by email or phone.
      </p>
      <ReservationInbox initialReservations={reservations} />
    </div>
  );
}

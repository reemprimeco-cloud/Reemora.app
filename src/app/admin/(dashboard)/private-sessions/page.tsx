import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { PrivateSessionInbox } from "@/components/admin/private-session-inbox";
import type { PrivateSessionRequest } from "@/lib/types";

export const metadata: Metadata = { title: "Private Session Requests" };

type Row = PrivateSessionRequest & { courses?: { title: string } | { title: string }[] | null };

export default async function AdminPrivateSessionsPage() {
  let requests: Row[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("private_session_requests")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    requests = (data as unknown as Row[]) ?? [];
  }

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Private Session Requests</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink-soft">
        Visitors who want a private 1:1 or in-house group session with a custom date/time instead of joining a scheduled cohort. No payment collected — confirm date, time, group size, whether they need an attendance certificate, and pricing directly with them.
      </p>
      <PrivateSessionInbox initialRequests={requests} />
    </div>
  );
}

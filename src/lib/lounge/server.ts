import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import type { LoungeMemberRow } from "@/lib/supabase/lounge.types";

export interface LoungeViewer {
  /** Supabase Auth user (null when signed out). */
  user: { id: string; email: string | null } | null;
  role: "admin" | "student" | null;
  member: LoungeMemberRow | null;
  isAdmin: boolean;
  /** Signed in with an approved Lounge membership. */
  isApproved: boolean;
  unreadCount: number;
}

const EMPTY: LoungeViewer = { user: null, role: null, member: null, isAdmin: false, isApproved: false, unreadCount: 0 };

/** Who is looking at the Lounge. Cached per request so the layout, nav
 *  and page can all call it without repeating the queries. */
export const getLoungeViewer = cache(async (): Promise<LoungeViewer> => {
  if (!isSupabaseConfigured) return EMPTY;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return EMPTY;

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("lounge_members").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const isApproved = member?.status === "approved";
  let unreadCount = 0;
  if (isApproved) {
    const { count } = await supabase
      .from("lounge_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unreadCount = count ?? 0;
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    role: profile?.role ?? null,
    member: member ?? null,
    isAdmin: profile?.role === "admin",
    isApproved,
    unreadCount,
  };
});

/** For member-only pages: bounce signed-out visitors to sign-in and
 *  anyone without approved access back to /lounge, where their status is
 *  explained. Returns the viewer when access is fine. */
export async function requireApprovedPage(nextPath: string): Promise<LoungeViewer> {
  const { redirect } = await import("next/navigation");
  const viewer = await getLoungeViewer();
  if (!viewer.user) redirect(`/lounge/login?next=${encodeURIComponent(nextPath)}`);
  if (!viewer.isApproved) redirect("/lounge");
  return viewer;
}

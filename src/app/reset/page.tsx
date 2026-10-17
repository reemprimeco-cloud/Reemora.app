import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Landing point for a password-recovery link that did not say which area
 *  it was for: admins go to the admin reset page, everyone else to the
 *  Lounge one. Without a session the link has expired. */
export const dynamic = "force-dynamic";

export default async function ResetRouter() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login?reset=expired");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  redirect(isAdmin ? "/admin/reset" : "/lounge/reset");
}

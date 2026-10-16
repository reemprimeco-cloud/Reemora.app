import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLoungeViewer } from "@/lib/lounge/server";
import { getLang, getDict } from "@/lib/i18n/get-lang";
import { NotificationList } from "@/components/lounge/notification-list";
import { PageHeader } from "@/components/lounge/page-header";

export const metadata: Metadata = { title: "Notifications" };

/** Any signed-in applicant can read their notifications (the approval
 *  decision arrives here), so this page is gated on sign-in, not approval. */
export default async function NotificationsPage() {
  const [viewer, lang] = await Promise.all([getLoungeViewer(), getLang()]);
  if (!viewer.user) redirect("/lounge/login?next=/lounge/notifications");
  const t = getDict(lang).lounge.notifications;

  const supabase = await createClient();
  const { data } = await supabase.from("lounge_notifications").select("*").eq("user_id", viewer.user.id).order("created_at", { ascending: false }).limit(100);

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title={t.title} />
      <NotificationList initial={data ?? []} />
    </div>
  );
}

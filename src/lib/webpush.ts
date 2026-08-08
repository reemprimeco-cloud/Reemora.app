import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hello@reemora.app";
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

/** Push a notification to every subscribed admin device. Best-effort —
 *  silently no-ops if VAPID keys aren't configured, and prunes any
 *  subscription the push service reports as gone (410/404) instead of
 *  retrying it forever. Never throws into the caller. */
export async function sendWebPushToAdmins(payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    const supabase = await createServiceRoleClient();
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
    if (error || !subs?.length) return;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload)
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expired or was revoked by the browser — remove
            // it so we stop trying.
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            console.error("Web push send error:", err);
          }
        }
      })
    );
  } catch (err) {
    console.error("Web push error:", err);
  }
}

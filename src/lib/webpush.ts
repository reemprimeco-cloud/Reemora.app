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

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one payload to a set of subscriptions, pruning any the push
 *  service reports as gone (404/410). Never throws into the caller. */
async function sendToSubscriptions(subs: SubRow[], payload: PushPayload): Promise<void> {
  if (!subs.length) return;
  const supabase = await createServiceRoleClient();
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked by the browser — remove it
          // so we stop trying.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Web push send error:", err);
        }
      }
    })
  );
}

/** Push a notification to every subscribed admin device. Best-effort —
 *  silently no-ops if VAPID keys aren't configured. Only rows belonging to
 *  an admin account are targeted, so Lounge members who enable push never
 *  receive back-office alerts. */
export async function sendWebPushToAdmins(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const supabase = await createServiceRoleClient();
    const { data: admins } = await supabase.from("users").select("id").eq("role", "admin");
    const adminIds = (admins ?? []).map((a) => a.id);
    if (!adminIds.length) return;
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", adminIds);
    if (error || !subs?.length) return;
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    console.error("Web push error:", err);
  }
}

/** Push a notification to specific members' devices (Lounge activity). */
export async function sendWebPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!ensureConfigured() || !userIds.length) return;
  try {
    const supabase = await createServiceRoleClient();
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (error || !subs?.length) return;
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    console.error("Web push error:", err);
  }
}

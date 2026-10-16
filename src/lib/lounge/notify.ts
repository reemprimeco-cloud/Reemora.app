import type { Db } from "@/lib/lounge/api";
import { sendWebPushToUsers } from "@/lib/webpush";

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  actorId?: string | null;
  /** Stable key for the event — a second call with the same key is a no-op
   *  so retries / double-processing never produce duplicate rows. */
  dedupeKey?: string | null;
  /** Also push to the member's subscribed devices (best-effort). */
  push?: boolean;
}

/** Writes an in-app notification (service role — members can't insert
 *  these themselves) and optionally fans out to Web Push. Never throws. */
export async function notify(service: Db, input: NotificationInput): Promise<void> {
  try {
    // A member never gets notified about their own action.
    if (input.actorId && input.actorId === input.userId) return;

    const { data, error } = await service
      .from("lounge_notifications")
      .upsert(
        {
          user_id: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          url: input.url ?? null,
          actor_id: input.actorId ?? null,
          dedupe_key: input.dedupeKey ?? null,
        },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      )
      .select("id");

    if (error) {
      console.error("lounge notification insert failed:", error.message);
      return;
    }
    // upsert with ignoreDuplicates returns no rows when the key already
    // existed — in that case the push already went out the first time.
    if (!data?.length) return;

    if (input.push !== false) {
      await sendWebPushToUsers([input.userId], {
        title: input.title,
        body: input.body ?? "",
        url: input.url ?? "/lounge/notifications",
      });
    }
  } catch (err) {
    console.error("lounge notify error:", err);
  }
}

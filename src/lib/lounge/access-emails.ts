/** Who gets the "set your password" email from the admin bulk action:
 *  approved members who have not really got into their account yet (see
 *  migration 0037 for what counts as access), excluding admins and anyone
 *  who was sent a link in the last few minutes (a double tap, or a reset
 *  the member just asked for, would otherwise cancel the link they have). */

export const RECENT_LINK_MINUTES = 10;

export interface AccessSignal {
  user_id: string;
  has_access: boolean;
  recovery_sent_at: string | null;
}

export function needsAccessEmail(signal: AccessSignal, opts: { isAdmin: boolean; now?: number }): boolean {
  if (opts.isAdmin || signal.has_access) return false;
  if (signal.recovery_sent_at) {
    const sent = Date.parse(signal.recovery_sent_at);
    if (Number.isFinite(sent) && (opts.now ?? Date.now()) - sent < RECENT_LINK_MINUTES * 60_000) return false;
  }
  return true;
}

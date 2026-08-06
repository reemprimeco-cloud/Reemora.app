/** Fire-and-forget Telegram notifications for admin-facing events (new
 *  registrations, etc). Reads TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID from
 *  env — both optional, so this silently no-ops in any environment
 *  (local dev, preview deploys) where they aren't configured, instead of
 *  breaking the request that triggered it. */
export async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) {
      console.error("Telegram notification failed:", res.status, await res.text());
    }
  } catch (err) {
    // Never let a notification failure break the registration/payment flow
    // that triggered it.
    console.error("Telegram notification error:", err);
  }
}

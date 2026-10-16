import type { Instrumentation } from "next";

/** Server-side error alerting without a third-party SDK.
 *
 *  Next.js calls onRequestError for every uncaught error in a route,
 *  page or server action. We log a structured line (Vercel keeps those in
 *  Runtime Logs) and, when the Telegram bot is configured, send one alert
 *  per distinct error per five minutes so a broken route is noticed
 *  immediately without flooding the chat. Set SENTRY_DSN later and this
 *  is the one place to add the SDK call. */

const recent = new Map<string, number>();
const ALERT_WINDOW_MS = 5 * 60 * 1000;

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const error = err instanceof Error ? err : new Error(String(err));
  const line = {
    level: "error",
    message: error.message,
    name: error.name,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    stack: error.stack?.split("\n").slice(0, 6).join("\n"),
  };
  console.error("[request-error]", JSON.stringify(line));

  // Never alert for the Lounge's own 4xx-style signals; only real crashes.
  const key = `${context.routePath}:${error.name}:${error.message.slice(0, 80)}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < ALERT_WINDOW_MS) return;
  recent.set(key, now);
  if (recent.size > 200) {
    for (const [k, t] of recent) if (now - t > ALERT_WINDOW_MS) recent.delete(k);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚨 Reemora error\n${request.method} ${request.path}\n${error.name}: ${error.message.slice(0, 300)}\n(route ${context.routePath})`,
      }),
    });
  } catch {
    /* alerting must never throw */
  }
};

/** Transactional email through Resend's REST API, sent from the site's own
 *  domain so members see "Reemora", not Supabase. Server-only: the API key
 *  never reaches the browser. When RESEND_API_KEY is not set, callers fall
 *  back to Supabase's built-in mailer, so nothing breaks before the domain
 *  is verified. */

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function brandedEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const DEFAULT_FROM = "Reemora <hello@reemora.app>";

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Email sending is not configured." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("sendEmail: Resend responded", res.status, body.slice(0, 300));
      return { ok: false, error: `Email service error (${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { ok: false, error: "Email service unreachable." };
  }
}

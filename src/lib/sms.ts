/** Outbound phone messaging for students (installment reminders). Uses
 *  Twilio's REST API directly over fetch — no SDK needed. Sends SMS by
 *  default; set TWILIO_FROM to a `whatsapp:+…` sender to deliver over
 *  WhatsApp instead. Silently no-ops when Twilio isn't configured so
 *  preview deploys never fail on it. */

const KUWAIT_CC = "965";

/** Normalises a user-typed phone to E.164. Kuwait numbers (8 digits) get
 *  +965 prefixed automatically; anything with an explicit country code is
 *  kept as-is. Returns null when it can't be made dialable. */
export function normalisePhone(raw: string): string | null {
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `${KUWAIT_CC}${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export interface SendSmsResult {
  ok: boolean;
  channel: "sms" | "whatsapp";
  to: string;
  sid?: string;
  error?: string;
  skipped?: "not_configured" | "bad_phone";
}

export async function sendSms(toRaw: string, body: string): Promise<SendSmsResult> {
  const from = (process.env.TWILIO_FROM ?? "").trim();
  const channel: SendSmsResult["channel"] = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const to = normalisePhone(toRaw);

  if (!isSmsConfigured()) {
    return { ok: false, channel, to: to ?? toRaw, skipped: "not_configured" };
  }
  if (!to) {
    return { ok: false, channel, to: toRaw, skipped: "bad_phone", error: "Phone number is not dialable." };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const params = new URLSearchParams({
    From: from,
    To: channel === "whatsapp" ? `whatsapp:${to}` : to,
    Body: body,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      console.error("Twilio send failed:", res.status, data?.message);
      return { ok: false, channel, to, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, channel, to, sid: data.sid };
  } catch (err) {
    console.error("Twilio send error:", err);
    return { ok: false, channel, to, error: String(err) };
  }
}

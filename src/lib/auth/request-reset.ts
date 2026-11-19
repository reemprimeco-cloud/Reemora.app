/** Asks the server for a Reemora-branded password-reset email.
 *  "sent": done (or the address has no account; the reply never says).
 *  "failed": the email could not be sent — tell the person to retry.
 *  "fallback": branded email is not configured; use Supabase's own email. */
export async function requestBrandedReset(email: string): Promise<"sent" | "failed" | "fallback"> {
  try {
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; fallback?: boolean };
    if (data.fallback) return "fallback";
    if (res.status === 400) return "sent";
    return res.ok && data.ok ? "sent" : "failed";
  } catch {
    return "fallback";
  }
}

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Where Supabase Auth sends the browser after an email link is clicked
 *  (sign-up confirmation, password reset). Handles both link styles:
 *    ?code=...                  PKCE flow — exchange for a session
 *    ?token_hash=...&type=...   OTP flow  — verify directly
 *  Whatever happens, the email itself is already confirmed on Supabase's
 *  side by the time we're here, so on failure we still land the user on
 *  the sign-in page with a "confirmed" banner instead of an error wall. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next") ?? "/lounge";
  // Only ever redirect inside the site.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/lounge";

  const supabase = await createClient();
  let ok = false;

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      ok = !error;
    }
  } catch (err) {
    console.error("auth callback:", err);
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const fallback = new URL("/lounge/login", origin);
  fallback.searchParams.set("confirmed", "1");
  if (next !== "/lounge") fallback.searchParams.set("next", next);
  return NextResponse.redirect(fallback);
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { isValidHttpUrl } from "@/lib/utils";

const isSupabaseConfigured = Boolean(
  isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LOUNGE_PUBLIC = new Set(["/lounge/join", "/lounge/login", "/lounge/reset"]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/login";
  // Reemora Lounge: everything under /lounge/ needs a signed-in user except
  // the landing page and the sign-in / apply / reset screens. Whether that
  // user is an *approved* member is decided by the page (and by RLS), not
  // here — pending/rejected members still need to reach their status page.
  const isLoungeRoute = path.startsWith("/lounge/") && !LOUNGE_PUBLIC.has(path);

  // Supabase isn't provisioned/reachable — skip auth gating so the rest of
  // the site (and dev preview) still works. Admin routes fall through
  // unprotected in this state; do not deploy to production without
  // NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY configured
  // and reachable.
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // A network/Supabase outage must not 500 the entire site. Fail closed for
  // admin routes (treat as logged-out) and fail open for everything else.
  // getClaims() verifies the session JWT against the project's public
  // signing key without a network call where the project uses asymmetric
  // keys, and falls back to the auth server otherwise. The pages and RLS
  // still authorize every read/write; this only decides redirects.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ? { id: data.claims.sub } : null;
  } catch (err) {
    console.error("middleware: auth.getClaims() failed:", err);
  }

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path === "/admin/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isLoungeRoute && !user) {
    const loginUrl = new URL("/lounge/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|cv/|api/payments).*)",
  ],
};

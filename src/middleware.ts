import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { isValidHttpUrl } from "@/lib/utils";

const isSupabaseConfigured = Boolean(
  isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/login";

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
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("middleware: auth.getUser() failed:", err);
  }

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (path === "/admin/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|cv/|api/payments).*)",
  ],
};

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cookie-free client for reading public, RLS-open data (courses, categories,
 * testimonials, settings, instructors/certificates). Safe to call from
 * generateStaticParams / generateMetadata, which run at build time with no
 * request context — the cookie-based client in server.ts would throw there
 * ("cookies() called outside a request scope").
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

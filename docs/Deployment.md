# Deployment

Target: Netlify, custom domain `reemora.app`, Supabase-hosted Postgres/Auth/Storage.

## 1. Provision Supabase

1. Create a Supabase project (or use an existing one dedicated to Reemora — don't reuse a project that has unrelated production data).
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql` once. It creates all 13 tables, indexes, triggers, RPC functions, RLS policies, storage buckets, and seed data.
3. Create your admin login: **Authentication → Add user** (email + password).
4. Promote that user to admin via SQL Editor:
   ```sql
   update public.users set role = 'admin' where email = 'you@example.com';
   ```
5. Copy the project's URL and keys from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only, never expose to the client or commit to git**)

## 2. Provision MyFatoorah

1. Get an API key from the MyFatoorah dashboard (test environment first: `https://apitest.myfatoorah.com`; switch to `https://api.myfatoorah.com` for live).
2. Set `MYFATOORAH_API_KEY` and `MYFATOORAH_BASE_URL` accordingly.

## 3. Environment variables

Set the following in **Netlify → Site settings → Environment variables** (mirrors `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public — RLS enforces access control, not secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret.** Used only inside API routes (`api/payments/*`, `api/contact`) via `createServiceRoleClient()` |
| `MYFATOORAH_API_KEY` | Yes | **Secret.** Used only server-side in `src/lib/myfatoorah.ts` |
| `MYFATOORAH_BASE_URL` | Yes | `https://apitest.myfatoorah.com` (test) or `https://api.myfatoorah.com` (live) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://reemora.app` — used for canonical URLs, sitemap, and the MyFatoorah callback/error redirect URLs |

Never commit `.env.local`; it's already covered by `.gitignore` (`.env*` with a tracked `.env.example` exception).

## 4. Deploy to Netlify

1. Create a new Netlify site from this Git repository.
2. `netlify.toml` already configures everything needed:
   - `command = "npm run build"`, `publish = ".next"`
   - `@netlify/plugin-nextjs` — handles Next.js SSR/ISR/route handlers on Netlify
   - Security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) applied to every route
3. Trigger a deploy (push to the connected branch, or **Deploys → Trigger deploy**).
4. Confirm the build succeeds and the site loads at the Netlify-provided `*.netlify.app` URL before attaching the custom domain.

## 5. Connect `reemora.app`

1. **Netlify → Domain settings → Add a domain** → `reemora.app`.
2. At your DNS provider, point the domain at Netlify:
   - Apex domain (`reemora.app`): `A`/`ALIAS`/`ANAME` record to Netlify's load balancer (Netlify shows the exact value once the domain is added), or use Netlify DNS if you delegate the zone to them.
   - `www.reemora.app`: `CNAME` to your Netlify site's `*.netlify.app` hostname.
3. Wait for DNS propagation, then enable **HTTPS** (Netlify provisions a Let's Encrypt certificate automatically once DNS resolves correctly).
4. Set `NEXT_PUBLIC_SITE_URL=https://reemora.app` (already required above) so canonical URLs, the sitemap, and MyFatoorah callback URLs point at the production domain rather than a preview URL.

## 6. Post-deploy checklist

- [ ] Load `/` and confirm real Supabase data renders (not the seed-data fallback) — check the Netlify function logs for any `Host not in allowlist` or connection errors.
- [ ] Log into `/admin/login` with the promoted admin account.
- [ ] Replace placeholder content per the [Admin Guide](./AdminGuide.md#content-to-replace-before-launch): trainer CV, certificate images, at least one real course image.
- [ ] Run a full test registration end-to-end against the **test** MyFatoorah environment before switching `MYFATOORAH_BASE_URL` to live.
- [ ] Verify `/sitemap.xml` and `/robots.txt` resolve and reference the production domain.
- [ ] Confirm `/admin/**` is not indexed (check `robots.txt` disallows `/admin` and `/api`).

## Preview/branch deploys

Netlify branch deploys work out of the box with the same environment variables (set them as shared, or per-context if you want previews to use a separate Supabase project/test MyFatoorah key). Since `middleware.ts` fails open on the public site and fails closed on `/admin` when Supabase is unreachable, a misconfigured preview environment degrades to seed-data browsing rather than a hard failure — but `/admin` **will** be inaccessible until Supabase env vars are set correctly for that context.

## Rollback

Netlify keeps every previous deploy; use **Deploys → (previous deploy) → Publish deploy** to roll back instantly without a new build. Database migrations are additive/append-only in this project (no destructive migration has been written) — rolling back the app does not require rolling back the schema.

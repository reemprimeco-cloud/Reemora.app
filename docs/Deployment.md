# Deployment

Target: Vercel, custom domain `reemora.app`, Supabase-hosted Postgres/Auth/Storage.

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

Set the following in **Vercel → Project Settings → Environment Variables** (mirrors `.env.example`). Add each to whichever environments you use (Production, Preview, Development) — see [EnvironmentVariables.md](./EnvironmentVariables.md) for full details:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public — RLS enforces access control, not secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret.** Mark as "Sensitive" in Vercel so it's write-only after saving |
| `MYFATOORAH_API_KEY` | Yes | **Secret.** Mark as "Sensitive" |
| `MYFATOORAH_BASE_URL` | Yes | `https://apitest.myfatoorah.com` (test) or `https://api.myfatoorah.com` (live) |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://reemora.app` in Production; leave as the Preview URL (or omit and let it default) for Preview deployments |

Never commit `.env.local`; it's already covered by `.gitignore` (`.env*` with a tracked `.env.example` exception).

## 4. Deploy to Vercel

This is a standard Next.js 15 App Router project — Vercel needs **zero configuration** to build and run it correctly. There is no `vercel.json` in this repository; Vercel auto-detects the Next.js framework, runs `next build` (from `package.json`'s `build` script), and serves the App Router's Server Components, static pages, API routes, and Edge Middleware natively.

1. **Import the project**: Vercel dashboard → **Add New → Project** → select this Git repository.
2. Vercel auto-detects **Framework Preset: Next.js** — leave the build command, output directory, and install command on their defaults.
3. Add the environment variables from step 3 above before the first deploy (or add them and redeploy).
4. Click **Deploy**. Confirm the build succeeds and the site loads correctly at the generated `*.vercel.app` preview URL before attaching the custom domain.

Security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) are defined in `next.config.ts`'s `headers()` function — Vercel applies these automatically at build time; nothing platform-specific is required for them to take effect.

## 5. Connect `reemora.app`

1. **Vercel → Project → Settings → Domains** → add `reemora.app` (and `www.reemora.app` if you want the `www` variant to work too).
2. At your DNS provider, point the domain at Vercel using whichever records Vercel shows for your setup:
   - Apex domain (`reemora.app`): an `A` record to Vercel's anycast IP (Vercel displays the exact value on the Domains page), or delegate the zone to Vercel's nameservers.
   - `www.reemora.app`: a `CNAME` record to `cname.vercel-dns.com`.
3. Wait for DNS propagation, then confirm the domain shows **Valid Configuration** in Vercel. HTTPS is provisioned automatically (Vercel issues and renews the certificate).
4. Set `NEXT_PUBLIC_SITE_URL=https://reemora.app` in the **Production** environment variables (already required above) so canonical URLs, the sitemap, and MyFatoorah callback URLs point at the production domain rather than a preview URL.

## 6. Post-deploy checklist

- [ ] Load `/` and confirm real Supabase data renders (not the seed-data fallback) — check **Vercel → Project → Deployments → (deployment) → Functions/Logs** for any `Host not in allowlist` or connection errors.
- [ ] Log into `/admin/login` with the promoted admin account.
- [ ] Replace placeholder content per the [Admin Guide](./AdminGuide.md#content-to-replace-before-launch): trainer CV, certificate images, at least one real course image.
- [ ] Run a full test registration end-to-end against the **test** MyFatoorah environment before switching `MYFATOORAH_BASE_URL` to live.
- [ ] Verify `/sitemap.xml` and `/robots.txt` resolve and reference the production domain.
- [ ] Confirm `/admin/**` is not indexed (check `robots.txt` disallows `/admin` and `/api`).

## Preview deployments

Every push/PR gets its own Vercel Preview Deployment automatically. Set the same environment variables for the **Preview** environment (Vercel lets you scope variables per environment) — or point Preview at a separate Supabase project/test MyFatoorah key if you want to keep preview traffic fully isolated from production data. Since `middleware.ts` fails open on the public site and fails closed on `/admin` when Supabase is unreachable, a preview environment with missing/misconfigured Supabase env vars degrades to seed-data browsing rather than a hard failure — but `/admin` **will** be inaccessible until Supabase env vars are set correctly for that environment.

## Rollback

Vercel keeps every previous deployment; use **Deployments → (previous deployment) → Promote to Production** to roll back instantly without a new build. Database migrations are additive/append-only in this project (no destructive migration has been written) — rolling back the app does not require rolling back the schema.

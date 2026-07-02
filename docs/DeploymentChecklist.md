# Deployment Checklist

Actionable, step-by-step checklist for shipping Reemora to production. Narrative context for each step is in [Deployment.md](./Deployment.md).

## 1. Supabase

- [ ] Supabase project created (dedicated to Reemora — not shared with unrelated data)
- [ ] `supabase/schema.sql` run once in the SQL Editor, with no errors
- [ ] Verify all 13 tables exist (Table Editor, or `select count(*) from information_schema.tables where table_schema = 'public';` → 13)
- [ ] Verify RLS is enabled on all 13 tables (`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';`)
- [ ] Verify storage buckets `course-images` and `site-assets` exist and are public
- [ ] Admin user created (Authentication → Add user)
- [ ] Admin user promoted: `update public.users set role = 'admin' where email = '...';`
- [ ] Project URL, anon key, and service-role key copied from Project Settings → API

## 2. MyFatoorah

- [ ] API key obtained from the MyFatoorah dashboard
- [ ] Confirmed which environment to launch on: test (`apitest.myfatoorah.com`) vs. live (`api.myfatoorah.com`)

## 3. Environment variables

Set in Vercel → Project Settings → Environment Variables (see [EnvironmentVariables.md](./EnvironmentVariables.md) for full details). Add each to the **Production** environment at minimum; add to **Preview**/**Development** too if you want non-production deploys fully functional:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (marked Sensitive)
- [ ] `MYFATOORAH_API_KEY` (marked Sensitive)
- [ ] `MYFATOORAH_BASE_URL`
- [ ] `NEXT_PUBLIC_SITE_URL` (set to the real production URL, e.g. `https://reemora.app`, for the Production environment)

## 4. Vercel project

- [ ] Project imported into Vercel from this Git repository
- [ ] Framework preset auto-detected as **Next.js**; build/output/install commands left on their defaults (no `vercel.json` required — see [Deployment.md](./Deployment.md#4-deploy-to-vercel))
- [ ] First deploy triggered and succeeds
- [ ] Site loads correctly at the generated `*.vercel.app` preview URL before attaching the custom domain
- [ ] Response headers spot-checked (`curl -I`) to confirm `Content-Security-Policy`, `Strict-Transport-Security`, and the other headers from `next.config.ts` are present

## 5. Domain

- [ ] `reemora.app` (and `www.reemora.app`) added in Vercel → Project → Settings → Domains
- [ ] DNS records updated at the domain registrar (`A` record to Vercel's IP for the apex, `CNAME` to `cname.vercel-dns.com` for `www` — or delegate the zone to Vercel)
- [ ] Domain shows **Valid Configuration** in Vercel
- [ ] HTTPS certificate provisioned and active (Vercel auto-provisions once DNS resolves)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the final production domain exactly (including `https://`, no trailing slash)

## 6. Post-deploy verification

- [ ] `/` loads and renders **real Supabase data**, not the seed-data fallback (check Vercel → Deployments → Logs for `Host not in allowlist` or connection errors — there should be none)
- [ ] `/admin/login` reachable and the promoted admin account can sign in
- [ ] `/admin` and all sub-routes require authentication (visiting while logged out redirects to `/admin/login`)
- [ ] `/sitemap.xml` resolves and lists the production domain
- [ ] `/robots.txt` resolves and disallows `/admin` and `/api`
- [ ] A full test registration completed end-to-end against the MyFatoorah **test** environment: form submission → redirect to MyFatoorah → payment → callback → registration shows as `confirmed` in `/admin/registrations` → seat count decremented
- [ ] Contact form submission arrives in `/admin/messages`
- [ ] Switch `MYFATOORAH_BASE_URL`/`MYFATOORAH_API_KEY` to live credentials only after the test-environment run above passes

## 7. Content

See [AdminGuide.md → Content to replace before launch](./AdminGuide.md#content-to-replace-before-launch):

- [ ] Real trainer CV uploaded or linked
- [ ] Real certificate images uploaded
- [ ] At least one real course image uploaded (placeholders are safe to leave, but real photos are recommended)
- [ ] Site settings reviewed: contact email, phone, address, social links

## 8. Rollback plan confirmed

- [ ] Know how to roll back: Vercel → Deployments → select a previous deployment → Promote to Production (instant, no rebuild needed)

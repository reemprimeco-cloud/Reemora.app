# Reemora — Build Apps with AI

Production platform for Reemora: dynamic marketing site, AI course catalog, UPayments-powered registration (pay in full or 2 installments), and a Supabase-authenticated admin panel for managing courses, scheduling, instructors, testimonials, site settings and contact messages.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage) · UPayments · Twilio (installment reminders).

## Status

The app runs and builds today against **seed data** (`src/lib/data/seed-courses.ts`) whenever Supabase env vars are absent, or whenever a query to Supabase fails — every data-access function in `src/lib/data/*.ts` falls back to seed data on error. Once `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are set and the project is reachable, every page automatically switches to reading/writing the real tables — no code changes needed.

Until Supabase is connected, `/admin` routes are **not auth-protected** (middleware skips the auth check when Supabase env vars are absent, purely so local preview isn't blocked). Do not deploy to production without Supabase configured.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

```bash
npm run build   # production build + type check
npm run lint
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project connection (public, safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by API routes to write registrations/payments — never expose to the client |
| `UPAYMENTS_API_KEY` / `UPAYMENTS_BASE_URL` | UPayments gateway (sandbox or live) |
| `CRON_SECRET` | Protects the daily installment-reminder cron (`vercel.json`) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | SMS or WhatsApp sender for second-installment reminders |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for SEO metadata, UPayments callback URLs and reminder pay-links |

## Database schema

**`supabase/schema.sql`** is the single file to paste into the Supabase SQL Editor — it's the concatenation of everything in `supabase/migrations/`, in order:

1. `0001_extensions_and_helpers.sql` — `pgcrypto`, the shared `set_updated_at()` trigger function.
2. `0002_tables.sql` — all 13 tables, indexes, triggers, and the `decrement_seats()` RPC:
   - `users` (extends `auth.users`, auto-populated by an `on_auth_user_created` trigger), `instructors`, `certificates`
   - `course_categories`, `courses`, `course_schedule` (a course can have multiple cohorts/schedules)
   - `registrations`, `payments`, `payment_transactions` (audit log of every gateway interaction and reminder)
   - `testimonials`, `website_settings` (key/value site config), `portfolio`, `contact_messages`
3. `0003_rls.sql` — `is_admin()` helper (checks `public.users.role`) plus RLS policies for every table: public read on published content, admin-only writes, no public access at all to `payments`/`payment_transactions`, and a public `course-images` + `site-assets` storage bucket pair.
4. `0004_seed.sql` — starter categories, one instructor with 3 certificates, 4 courses with schedules, 3 testimonials, and default site settings.

This schema was validated end-to-end against a real local Postgres instance (with `auth`/`storage` schemas stubbed to match Supabase) before being handed off — every table, trigger, function, and the full seed data insert without error.

After running it, create your admin login in **Supabase Dashboard → Authentication → Add user**, then promote them:
```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

Regenerate `src/lib/supabase/database.types.ts` once the project is reachable:
```bash
supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

## Architecture

```
src/
  app/
    page.tsx                     Homepage (hero slider, features, courses, About/CV, certificates, testimonials)
    courses/page.tsx             Course catalog (search + filters)
    courses/[slug]/page.tsx      Course detail (all cohorts via course_schedule)
    register/[slug]/page.tsx     Registration form, registers against a specific cohort
    contact/page.tsx             Public contact form -> contact_messages
    admin/login/page.tsx         Supabase Auth login (no sidebar)
    admin/(dashboard)/           Auth-gated: dashboard, courses, categories, schedule,
                                  registrations, trainer & certificates, testimonials,
                                  contact messages, settings
    api/payments/upayments/      Creates registration + payment rows, starts a UPayments checkout (server-only)
    api/payments/installments/   Daily cron + admin trigger for 2nd-installment SMS reminders
    pay/[paymentId]/             Public pay page for an outstanding installment
    api/payments/callback/       Verifies payment status, updates payment/registration, decrements seats
    api/contact/                 Inserts a contact_messages row (public RLS insert policy)
  components/                    Reusable UI (header, footer, sliders, cards, admin CRUD widgets)
  lib/
    supabase/
      client.ts / server.ts      Cookie-aware clients (browser / server component & route handler)
      public.ts                  Cookie-free client for public reads — safe in generateStaticParams,
                                  which runs at build time with no request context
      database.types.ts          Hand-authored Database type (regenerate once the project is reachable)
    data/                        Data-access layer; every function falls back to seed data on error
    course-utils.ts              Pure helpers (e.g. primarySchedule) safe to import from client components
    upayments.ts                 UPayments API wrapper
    sms.ts                       Twilio SMS/WhatsApp sender
    payments/                    Checkout, verification, settlement + installment maths
  middleware.ts                  Refreshes the Supabase session + protects /admin routes (fails closed on error)
supabase/
  migrations/                    Numbered migration files (source of truth)
  schema.sql                     Concatenation of the above, ready to paste into the SQL Editor
```

Admin CRUD (courses, categories, schedule, trainer/certificates, testimonials, settings) talks to Supabase directly from the browser using the authenticated session; Row Level Security enforces that only signed-in admins can write. Registrations and payments are only ever written server-side via the service-role key, so amounts can't be tampered with from the client.

## Content to replace before launch

- **CV section** (`src/app/page.tsx`, `#about`) — bio comes from the `instructors` table (edit via `/admin/trainer`); replace `public/cv/reemora-cv.pdf` with the real CV, or update the `cv_url` setting via `/admin/settings`.
- **Certificates section** (`#certificates`) — manage via `/admin/trainer`; upload real certificate images to the `site-assets` storage bucket.
- **Course images** — uploaded per-course from `/admin/courses` (stored in the `course-images` bucket); branded SVG placeholders in `public/images/courses/` are used until then.
- **Footer contact details / social links** — edit via `/admin/settings` (`website_settings` table).

## Deployment (Vercel + reemora.app)

1. Provision the Supabase project, run `supabase/schema.sql` in the SQL Editor, and create + promote an admin user (see above).
2. Import this repo into Vercel — it's a standard Next.js 15 App Router project, so Vercel auto-detects the framework and build settings with no `vercel.json` required.
3. Set the environment variables above in Vercel → Project Settings → Environment Variables.
4. Point `reemora.app` at Vercel (Project → Settings → Domains → Add, then update the domain's DNS — an `A` record to Vercel's IP for the apex and a `CNAME` to `cname.vercel-dns.com` for `www`).

Full walkthrough and checklist: [docs/Deployment.md](./docs/Deployment.md) and [docs/DeploymentChecklist.md](./docs/DeploymentChecklist.md).
5. Deploy.

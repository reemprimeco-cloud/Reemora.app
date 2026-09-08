# Architecture

Reemora is a Next.js 15 (App Router) application backed by Supabase (Postgres, Auth, Storage). It serves a public marketing/course-catalog site, a registration + payment flow, and an authenticated admin panel, all from a single deployment.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme` config), `next-themes` for dark/light mode |
| Database | Supabase Postgres (13 tables, see [Database.md](./Database.md)) |
| Auth | Supabase Auth (email/password), session refreshed via middleware |
| Storage | Supabase Storage (`course-images`, `site-assets` public buckets) |
| Payments | UPayments (hosted checkout + server-to-server status verification); optional 2-installment plan with Twilio SMS/WhatsApp reminders via Vercel Cron |
| Hosting | Vercel (zero-config Next.js deployment) |

## High-level request flow

```
Browser
  │
  ├─ Public pages (/, /courses, /courses/[slug], /register/[slug], /contact)
  │     → Server Components fetch data via src/lib/data/* (cookie-free Supabase client)
  │     → Falls back to in-repo seed data if Supabase is unreachable
  │
  ├─ Admin panel (/admin/**)
  │     → middleware.ts gates every route except /admin/login
  │     → Client components talk to Supabase directly with the signed-in user's
  │       session (browser client); RLS enforces admin-only writes
  │
  └─ API routes (/api/**)
        → api/payments/upayments   — creates registration + payment(s), starts UPayments checkout
        → api/payments/callback    — verifies payment status, confirms registration, decrements seats
        → api/contact              — inserts a contact_messages row
        All three use the service-role Supabase client (bypasses RLS) because they
        perform trusted, server-validated writes that anonymous users can't do directly.
```

## Folder structure

```
src/
  app/
    page.tsx                     Homepage (hero slider, features, courses, About/CV, certificates, testimonials)
    courses/page.tsx             Course catalog (client-side search + filters over server-fetched data)
    courses/[slug]/page.tsx      Course detail page — SSG via generateStaticParams, JSON-LD structured data
    register/[slug]/page.tsx     Registration form for a specific course's cohort
    contact/page.tsx             Public contact form
    admin/login/page.tsx         Supabase Auth login (outside the dashboard layout)
    admin/(dashboard)/           Auth-gated route group: dashboard, courses, categories, schedule,
                                  registrations, trainer & certificates, testimonials, contact messages, settings
    api/payments/upayments/      POST — starts a registration + UPayments checkout (full or 2 installments)
    api/payments/callback/       GET/POST — UPayments return URL + webhook; verifies via get-payment-status
    api/payments/pay/[id]/       POST — mints a checkout link for an outstanding installment
    api/payments/installments/remind/  GET (cron) / POST (admin) — SMS reminders for the 2nd installment
    pay/[paymentId]/             Public pay page linked from reminder messages
    api/contact/                 POST — public contact form submission
    sitemap.ts / robots.ts       Next.js file-convention SEO routes
    layout.tsx                   Root layout: fonts, ThemeProvider, organization JSON-LD
  components/                    Reusable UI: header, footer, sliders, cards, forms, admin CRUD widgets,
                                  toast-provider.tsx / confirm-dialog.tsx (shared UX primitives)
  lib/
    supabase/
      client.ts                  Browser client (cookie-aware, for client components)
      server.ts                  createClient() — cookie-based server client (Server Components/Route Handlers)
                                  createServiceRoleClient() — server-only, bypasses RLS, used by API routes
      public.ts                  Cookie-free client for public reads — required by generateStaticParams,
                                  which runs at build time with no request/cookie context
      database.types.ts          Hand-authored Database type mirroring the Supabase schema
    data/                        Data-access layer (getCourses, getCourseBySlug, getInstructors, etc.)
                                  Every function reads via public.ts and falls back to seed data on error
    course-utils.ts              Pure, dependency-free helpers safe to import from client components
                                  (primarySchedule, courseImageSrc) — kept separate from lib/data to avoid
                                  pulling server-only Supabase imports into client bundles
    upayments.ts                 UPayments REST API wrapper (charge, get-payment-status)
    sms.ts                       Twilio SMS/WhatsApp sender (reminders)
    payments/checkout.ts         Shared checkout / verification / settlement helpers
    payments/installments.ts     50/50 split maths + reminder schedule constants
    types.ts                     Domain types derived from Database, plus composed types
                                  (CourseWithRelations, InstructorWithCertificates, WebsiteSettings)
  middleware.ts                  Refreshes the Supabase session cookie and protects /admin/** routes
supabase/
  migrations/                    Numbered SQL migrations (source of truth)
  schema.sql                     Concatenation of all migrations — paste into the Supabase SQL Editor
docs/                            This documentation set
```

## Rendering strategy

- **Homepage, course catalog, contact**: rendered on the server per-request (Server Components), reading through `src/lib/data/*`.
- **Course detail pages**: statically generated at build time via `generateStaticParams` (one page per published course slug), which is why they use the cookie-free `public.ts` Supabase client — `generateStaticParams` runs with no request context, so `next/headers`'s `cookies()` is unavailable.
- **Registration page**: server-rendered per request (needs the live seat count for the selected cohort).
- **Admin dashboard**: client components (`"use client"`) that read/write Supabase directly using the authenticated browser session; the surrounding page shells are server components that pass down initial data.

## Data-access fallback pattern

Every function in `src/lib/data/*.ts` (e.g. `getCourses`, `getCourseBySlug`, `getInstructors`, `getTestimonials`, `getWebsiteSettings`, `getCategories`) follows the same pattern:

1. Attempt to query Supabase via the cookie-free public client.
2. On any error (network failure, unreachable project, missing env vars), log the error and fall back to a matching entry in `src/lib/data/seed-courses.ts`.

This means the site is always renderable — in local development without Supabase configured, in a sandboxed environment with restricted network egress, or during a genuine Supabase outage — without ever showing a broken page to a visitor. `isSupabaseConfigured` (exported from `seed-courses.ts`) is also checked directly by the API routes and `middleware.ts` to decide whether to attempt a real Supabase call at all.

## Security model

- **RLS-enforced admin writes**: all admin CRUD (courses, categories, schedule, trainer/certificates, testimonials, settings) happens client-side against Supabase directly, but every table has Row Level Security requiring `public.is_admin()` to return true for the authenticated user. See [Database.md](./Database.md#row-level-security) for the full policy list.
- **Server-only financial writes**: `registrations`, `payments`, and `payment_transactions` have no public insert/select policy at all — they can only be written by the service-role client inside `/api/payments/*` route handlers, after the route has independently validated and priced the request server-side. This is what prevents a client from tampering with a registration's price. See [API.md](./API.md) for details.
- **Middleware auth gating**: `src/middleware.ts` redirects unauthenticated requests to `/admin/**` (except `/admin/login`) to the login page, and redirects an already-authenticated user away from `/admin/login`. It fails closed for admin routes (treats a Supabase error as logged-out) and fails open for the public site (a Supabase outage must not 500 the whole site).

## Theming

Dark/light mode is implemented with `next-themes`, driven by CSS custom properties (`--surface`, `--surface-alt`, etc.) defined per color-scheme in `globals.css` and exposed to Tailwind via `@theme inline`. The theme toggle lives in the site header and admin sidebar area is themed the same way.

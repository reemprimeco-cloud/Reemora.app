# Reemora — Build Apps with AI

Production platform for Reemora: dynamic marketing site, AI course catalog, MyFatoorah-powered registration, and a Supabase-authenticated admin panel for managing courses, scheduling and registrations.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + Storage) · MyFatoorah.

## Status

The app runs and builds today against **seed data** (`src/lib/data/seed-courses.ts`) because a dedicated Supabase project has not been provisioned yet. Once `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, every page automatically switches to reading/writing the real `courses` and `registrations` tables — no code changes needed.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by API routes to write registrations — never expose to the client |
| `MYFATOORAH_API_KEY` / `MYFATOORAH_BASE_URL` | MyFatoorah payment gateway (test or live) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for SEO metadata and MyFatoorah callback URLs |

## Database schema

SQL migrations live in `supabase/migrations/`:

- `0001_init.sql` — `courses` and `registrations` tables, RLS policies (public read on courses, authenticated-only write; registrations written only via the service-role key from API routes), and a public `course-images` storage bucket.
- `0002_seed_courses.sql` — the same four starter courses used in the seed-data fallback, so the catalog isn't empty on first launch.

Apply them with the Supabase CLI (`supabase db push`) or via the Supabase MCP `apply_migration` tool.

## Architecture

```
src/
  app/
    page.tsx                  Homepage (hero slider, features, CV, certificates, testimonials)
    courses/page.tsx          Course catalog (search + filters)
    courses/[slug]/page.tsx   Course detail
    register/[slug]/page.tsx  Registration form
    admin/login/page.tsx      Supabase Auth login (no sidebar)
    admin/(dashboard)/        Auth-gated admin: dashboard, courses, schedule, registrations
    api/payments/myfatoorah/  Creates the registration row + MyFatoorah payment session (server-only)
    api/payments/callback/    Verifies payment status with MyFatoorah, updates the registration
  components/                 Reusable UI (header, footer, sliders, cards, admin CRUD widgets)
  lib/
    supabase/                 Browser client, server client, service-role client
    data/courses.ts           Data-access layer (Supabase, falling back to seed data)
    myfatoorah.ts             MyFatoorah API wrapper
  middleware.ts                Refreshes the Supabase session + protects /admin routes
```

Admin CRUD (course create/edit/delete, image upload, scheduling) talks to Supabase directly from the browser using the authenticated session; Row Level Security enforces that only signed-in users can write. Registrations are only ever written server-side via the service-role key, so the payment amount can't be tampered with from the client.

## Content to replace before launch

- **CV section** (`src/app/page.tsx`, `#about`) — placeholder bio/timeline; swap `public/cv/reemora-cv.pdf` with the real CV.
- **Certificates section** (`#certificates`) — placeholder credential cards; add real certificate images and titles.
- **Course images** — uploaded per-course from the admin panel (stored in Supabase Storage); branded SVG placeholders in `public/images/courses/` are used until then.
- **Footer contact details / social links.**

## Deployment (Netlify + reemora.app)

1. Provision the Supabase project, run the migrations above, and create an admin user (Supabase Dashboard → Authentication → Add user).
2. Create a Netlify site from this repo. `netlify.toml` is already configured with the `@netlify/plugin-nextjs` build plugin.
3. Set the environment variables above in Netlify site settings.
4. Point `reemora.app` at Netlify (Netlify → Domain settings → Add custom domain, then update the domain's DNS — typically an `A`/`ALIAS` record to Netlify's load balancer and a `CNAME` for `www`).
5. Deploy.

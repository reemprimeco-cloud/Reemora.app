# Reemora Platform — Release v1.0.0

**Release date:** 2026-07-02
**Commit:** `5de8f28`
**Branch:** `claude/reemora-website-design-wl54sk`
**Status:** Production-ready — pending infrastructure deployment only

This is the first release-candidate build of the Reemora training platform: a public marketing site, AI course catalog, MyFatoorah-powered registration and payment flow, and a Supabase-authenticated admin panel, built as a single Next.js 15 application.

---

## What this release contains

- **Complete application source code** — see [Source Code](#source-code) below
- **Complete database schema** — 13-table Supabase Postgres schema with RLS, storage buckets, functions, and seed data (`supabase/schema.sql`)
- **Environment variable reference** — [docs/EnvironmentVariables.md](./docs/EnvironmentVariables.md)
- **Deployment checklist** — [docs/DeploymentChecklist.md](./docs/DeploymentChecklist.md)
- **Production readiness checklist** — [docs/ProductionChecklist.md](./docs/ProductionChecklist.md)
- **Full documentation set** — [docs/README.md](./docs/README.md) (index of all 10 documents)
- **Release Candidate audit log** — [RELEASE_NOTES.md](./RELEASE_NOTES.md)

### Deployment target: Vercel

The deployment target was switched from Netlify to Vercel as of this release. This required no application logic changes — only:

- `netlify.toml` removed; `@netlify/plugin-nextjs` removed from `package.json`
- HTTP security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) moved from `netlify.toml`'s `[[headers]]` block into `next.config.ts`'s `headers()` function — this is host-agnostic and takes effect under Vercel, `next start`, or any other Next.js-aware host
- **No `vercel.json` was added.** This is a standard Next.js App Router project with no custom rewrites/redirects and no build-command overrides — Vercel's zero-config Next.js detection handles the build, routing, static generation, API routes, and Edge Middleware without one. One would only be needed for custom redirects/rewrites, cron jobs, or non-default build settings, none of which this project has.
- `middleware.ts` (Supabase session refresh + `/admin` auth gating) uses only Edge-Runtime-compatible APIs (`@supabase/ssr`, `next/server`) and requires no changes for Vercel's Edge Middleware
- Verified: `npx tsc --noEmit`, `npx next lint`, and `npm run build` all still pass clean after the migration, producing the identical route manifest (30 routes: static, dynamic, and SSG)
- All deployment documentation (`docs/Deployment.md`, `docs/DeploymentChecklist.md`, `README.md`) rewritten for Vercel's dashboard/CLI and DNS setup

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, React 19) |
| Language | TypeScript (strict, zero `tsc` errors) |
| Styling | Tailwind CSS v4, `next-themes` dark/light mode |
| Database | Supabase Postgres — 13 tables, full RLS |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (`course-images`, `site-assets`) |
| Payments | MyFatoorah (hosted payment page) |
| Hosting target | Vercel (zero-config Next.js deployment, no `vercel.json` required) |

## Features

**Public site**
- Homepage: hero slider, feature highlights, featured courses, trainer bio/CV, certificates, testimonials, calls to action
- Course catalog with live search and category/level filtering
- Course detail pages (statically generated) with cohort scheduling, pricing, and structured data for SEO
- Registration flow with live seat availability and secure MyFatoorah checkout
- Contact form

**Admin panel** (`/admin`, authenticated)
- Dashboard with KPIs and recent registrations
- Course CRUD with image upload
- Category management
- Cohort/scheduling management
- Registrations log (read-only, financial-integrity by design)
- Trainer profile & certificates management
- Testimonials management
- Contact message inbox
- Site settings (contact info, social links, CV link)

**Cross-cutting**
- Dark/light mode
- Full WCAG accessibility pass (labels, ARIA, heading order, keyboard/dialog semantics)
- SEO: sitemap, robots, canonical URLs, Open Graph, JSON-LD structured data
- Toast notifications and confirm dialogs (no native browser `alert`/`confirm` anywhere)
- Global and admin-scoped loading/error boundaries
- Responsive at mobile/tablet/desktop, verified via automated screenshot audit

## Source code

Tracked in this Git repository, verified as of commit `5de8f28`: **105 files**, ~1.2 MB (excluding `node_modules`/`.next`, which are build artifacts, not source). The archive shipped alongside this release (`reemora-source-v1.0.0.tar.gz`) is a `git archive` of this exact commit — byte-identical to what's in the repository, with no untracked or ignored files.

Top-level layout:

```
src/app/            Routes (public pages, admin panel, API routes, sitemap/robots)
src/components/      Reusable UI + admin CRUD components
src/lib/             Supabase clients, data-access layer, types, utilities
supabase/            SQL migrations + concatenated schema.sql
docs/                Full documentation set (11 files, including the index)
public/              Static assets (logo, course placeholder images, CV placeholder)
```

Full breakdown: [docs/Architecture.md](./docs/Architecture.md).

## Database schema

`supabase/schema.sql` (582 lines) — a single file, ready to paste into the Supabase SQL Editor. Concatenates 4 ordered migrations from `supabase/migrations/`:

1. Extensions & helper functions
2. 13 tables, indexes, triggers, RPC functions
3. Row Level Security policies for every table + storage buckets
4. Seed data (categories, instructor, certificates, courses, schedules, testimonials, settings)

Full reference: [docs/Database.md](./docs/Database.md).

## Environment variables

Six variables, all verified present in `.env.example` and cross-checked against every `process.env` reference in the codebase — nothing missing, nothing extra:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MYFATOORAH_API_KEY`, `MYFATOORAH_BASE_URL`, `NEXT_PUBLIC_SITE_URL`

Full reference including what's secret vs. public and where each is used: [docs/EnvironmentVariables.md](./docs/EnvironmentVariables.md).

## Verification performed for this release

- [x] `npx tsc --noEmit` — zero errors
- [x] `npx next lint` — zero warnings/errors
- [x] `npm run build` — succeeds; all 30 routes generate (static, dynamic, and SSG)
- [x] Full Release Candidate audit completed (security, accessibility, SEO, performance, UX, forms, responsive design) — see [RELEASE_NOTES.md](./RELEASE_NOTES.md)
- [x] Database schema validated end-to-end against a real local Postgres instance before this release
- [x] Every file in this release package verified present (see the file-integrity check accompanying the packaged archive)

## What's NOT included / NOT done yet

- **Not deployed.** No Vercel project or `reemora.app` DNS has been configured by this process — that requires access to your Vercel and domain-registrar accounts. Follow [docs/DeploymentChecklist.md](./docs/DeploymentChecklist.md) to complete it.
- **Not connected to a live Supabase project from this environment** — this sandbox's network egress policy blocks the configured Supabase host, so live read/write was validated by an independent local Postgres run rather than against the real hosted project. The schema and application code require no changes to connect; only network access from wherever you deploy is required (unrestricted on Vercel).
- **Placeholder content** — trainer CV, certificate images, and course photos are placeholders pending real assets (see [docs/AdminGuide.md](./docs/AdminGuide.md#content-to-replace-before-launch)).
- **No automated test suite, transactional email, or self-serve password reset yet** — tracked as future work in [docs/ProjectRoadmap.md](./docs/ProjectRoadmap.md).

## Handover

This repository, at commit `5de8f28` on branch `claude/reemora-website-design-wl54sk`, plus the accompanying packaged archive, constitute the complete v1.0.0 release. To go live, follow [docs/DeploymentChecklist.md](./docs/DeploymentChecklist.md) top to bottom.

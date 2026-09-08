# Changelog

All notable changes to the Reemora platform are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- **Payment gateway switched from MyFatoorah to UPayments.** New `src/lib/upayments.ts` client (`POST /charge`, `GET /get-payment-status/{track_id}`), registration route moved to `POST /api/payments/upayments`, and the callback now accepts both the browser return (`GET`) and the server-to-server notification (`POST`). Every result is re-verified against UPayments' status API — redirect params alone never mark a payment paid. Site setting `payment_mode` value `myfatoorah` → `upayments` (migrated in `0018`).

### Added

- **Two-installment payment plan.** On the registration form students choose *Pay in full* or *2 installments*: 50% now, 50% due 30 days after the first payment clears. The seat is confirmed on the first installment; the second stays `pending` and can be paid any time from a public `/pay/{paymentId}` page.
- **Automatic installment reminders.** A Vercel cron (`vercel.json`, daily 06:00 UTC) hits `/api/payments/installments/remind` and texts students (Twilio SMS, or WhatsApp via `TWILIO_FROM=whatsapp:…`) a bilingual reminder with their pay link — 3 days before the due date, then every 3 days until paid, max 5. Admins can also send one immediately from the Registrations page (**Remind** button), which now shows the plan, paid/remaining balance and due date per row.
- Schema: `registrations.payment_plan` / `amount_paid`; `payments.installment_no`, `installments_total`, `due_date`, `gateway_*`, `reminder_count`, `last_reminder_at`; `payment_transactions.event_type` gains `reminder`; RPC `add_registration_paid_amount`.
- New env vars: `UPAYMENTS_API_KEY`, `UPAYMENTS_BASE_URL`, `CRON_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (see `docs/EnvironmentVariables.md`).

## [1.0.0] — 2026-07-02

First production release. Reemora is a Next.js 15 + TypeScript + Tailwind CSS platform backed by Supabase (Postgres, Auth, Storage), deployed on Vercel at [reemora.app](https://reemora.app).

### Added

- **Public site**: homepage (hero slider, feature highlights, featured courses, trainer bio/CV, certificates, testimonials), course catalog with search/filtering, statically-generated course detail pages, registration flow, contact form.
- **Payments**: MyFatoorah-integrated registration flow — server-side price derivation, seat-availability and cohort-status validation, payment callback with amount verification, full audit trail via `payment_transactions`.
- **Admin panel** (`/admin`, Supabase Auth-gated): dashboard with KPIs, course CRUD with image upload, category management, cohort/scheduling management, registrations log, trainer & certificates management, testimonials management, contact message inbox, site settings.
- **Database**: 13-table Supabase Postgres schema (`supabase/schema.sql`) with full Row Level Security on every table, storage buckets for course/site images, RPC functions (`decrement_seats`, `is_admin`), and an `on_auth_user_created` trigger to auto-provision user profiles.
- **Toast notifications and confirm dialogs**: accessible in-app UX primitives (`useToast`, `useConfirm`) replacing native browser `alert()`/`confirm()` across the admin panel.
- **Dark/light mode** via `next-themes`, applied consistently across public site and admin panel.
- **SEO infrastructure**: dynamic `sitemap.xml` and `robots.txt`, canonical URLs, Open Graph metadata, JSON-LD structured data (`EducationalOrganization`, `Course`), admin/API routes excluded from indexing.
- **Loading and error boundaries**: global and admin-scoped `loading.tsx`/`error.tsx`.
- **Documentation set** (`/docs`): Architecture, Database, API, Developer Guide, Admin Guide, Deployment, Deployment Checklist, Production Checklist, Environment Variables, Project Roadmap, plus an index.
- **Release artifacts**: `RELEASE_NOTES.md` (Release Candidate audit log), `RELEASE_v1.md` (release summary), and a packaged release archive (source, schema, checklists, verified via SHA-256 manifest).

### Changed

- Migrated deployment target from Netlify to Vercel: removed `netlify.toml` and `@netlify/plugin-nextjs`; moved HTTP security headers (`Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) into `next.config.ts`'s `headers()` function, verified present at runtime. No `vercel.json` required — zero-config Next.js deployment.
- Increased the header logo from 32px to 44px for legibility.

### Fixed

- **Critical**: closed a payment price-tampering vulnerability — the MyFatoorah registration API previously trusted a client-supplied price; it now derives price, currency, and course identity server-side from the database, keyed only by the cohort ID.
- Added payment amount verification on the MyFatoorah callback route, guarding against a stale or mismatched payment ID being replayed against a different invoice.
- Fixed a broken course image reference (`nocode-ai-apps.svg` 404) and replaced slug-guessed image paths with a shared `courseImageSrc()` fallback chain, so courses created without an image upload never 404.
- Fixed a sticky-header rendering bug where a translucent, non-blurred background let page content ghost through once scrolled.
- Hardened Supabase configuration checks (`isValidHttpUrl`) so a malformed `NEXT_PUBLIC_SUPABASE_URL` (e.g. a value pasted into the wrong environment-variable field) degrades gracefully to the seed-data fallback instead of crashing the build or every request — discovered and fixed during initial Vercel deployment.
- Fixed heading-hierarchy violations, missing accessible names on icon-only buttons, and missing `label`/`id` associations across the public site and admin panel (full WCAG pass).
- Fixed silent-failure empty submissions on the admin category and testimonial "Add" forms; aligned client/server validation for the registration and contact forms.
- Hid the homepage testimonials section entirely when there are zero published testimonials, instead of showing an empty heading.

### Security

- Row Level Security enforced on all 13 database tables; financial tables (`registrations`, `payments`, `payment_transactions`) have no public write path and are only ever written server-side with the service-role key after independent validation.
- File uploads (course images) validated for MIME type and size before upload.
- No secrets committed to version control; `.env.local` is gitignored, `.env.example` ships with no real values.

### Infrastructure

- Deployed to Vercel; DNS configured at the registrar (`A` record for the apex, `CNAME` for `www`); `reemora.app` redirects (308) to `www.reemora.app`, which serves the production deployment with an auto-provisioned SSL certificate.
- Supabase project provisioned; full schema applied; admin account created and promoted.

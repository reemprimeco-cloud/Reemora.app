# Changelog

All notable changes to the Reemora platform are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Reemora Lounge** — a members-only community at `/lounge` (Lounge / المجتمع in the site nav): application with admin approval (pending → approved / rejected / suspended), member profiles with social links and private-by-default contact details, a community feed (discussion, question, project showcase, milestone, tool posts) with comments, replies, "helpful" marks, likes, bookmarks, follows and reports, one public real-time chat room (no private messaging), an in-app notification center with optional Web Push, achievements with an append-only points ledger and profile trophy case, and Lounge Challenges with one-vote-per-member voting, documented tie-break, idempotent finalization and permanent winner badges. Admin dashboard gains Lounge Members, Moderation, Achievements & Points, Challenges and Audit Log sections. Migrations `0026`–`0030`; plan and security model in `docs/LoungePlan.md`.
- Lounge invitations: admins can pre-approve existing course registrants and send them an email invite or a copyable sign-in link (`/admin/lounge/invites`, migration `0031`).
- Lounge verified badges: admins can give any approved member a badge with custom text (e.g. "Certified Trainer") from Lounge Members, and an admin without a Lounge profile gets a one-click "Create my profile" card on `/lounge` that creates a verified "Reemora Team" profile. The badge appears next to the name in the feed, comments, chat, members directory, profiles and challenge entries (migration `0032`).
- Lounge profile links accept a bare username (e.g. `prime_kw`) or domain (`reemora.app`); the editor shows the platform prefix and stores a canonical https link, and profile chips show `@handle` so taps open the native app on phones.
- Lounge feed redesigned around the work itself: a stories-style strip of members who posted recently, then Instagram-style cards (author, swipeable screenshots or a gradient link cover for projects without one, like/comment/share/save row, like count, caption with "more", "View all N comments").
- Project comments are sorted into feedback buckets: Like, Needs work, Suggestion, Code, Design, Tips & advice, plus General. The author sees a count strip and grouped sections; commenters pick a bucket before posting (migration `0033`).
- Chat room accepts photo and file attachments (PDF, ZIP, Office, text, up to 10 MB) stored in a new `lounge-files` bucket with per-member folders; images are compressed in the browser first.
- Profile pictures save the moment the upload finishes (`/api/lounge/avatar`), independent of the rest of the form.
- PWA: 192/512 px icons (plus maskable variants), manifest shortcuts, an `/offline` fallback page served by the shared service worker, and an Add-to-Home-Screen card in Lounge settings.

### Changed

- Lounge navigation is faster: Vercel functions now run in Mumbai (`bom1`) next to the Supabase project, the middleware verifies the session JWT locally instead of calling the auth server, the viewer loader runs its queries in parallel, and `/lounge` has an instant loading skeleton so tab switches paint immediately.

- `sendWebPushToAdmins` now targets admin subscriptions only (members can also subscribe to push).
- CSP `connect-src` allows `wss://*.supabase.co` for Supabase Realtime.
- `/api/push/subscribe` writes with the service role so a device endpoint re-points to the current account.

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

- Browser image compression no longer gives up on large phone photos (48 MP iPhone shots were sent at full size and rejected by Storage); it now resizes during decode, retries at smaller sizes, and refuses the upload with a clear message if it still cannot fit. The `lounge-media` bucket limit is raised to 5 MB as a safety net.

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

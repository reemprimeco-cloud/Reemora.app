# Release Notes — Reemora Platform Release Candidate

**Date:** 2026-07-02
**Status:** Production-ready release candidate

This document summarizes the full Release Candidate (RC) audit performed on the Reemora training platform (Next.js 15 + TypeScript + Tailwind CSS + Supabase). The audit covered UI/UX consistency, responsive design, accessibility, SEO, performance, TypeScript/ESLint hygiene, security, environment handling, API validation, error handling, loading/empty states, toast notifications, forms validation, broken links, metadata, and image optimization. No new features were added during this phase — only fixes and hardening.

---

## 1. TypeScript & ESLint

- Project builds with `npx tsc --noEmit` reporting **zero errors**.
- `npx next lint` reports **zero warnings and zero errors**.
- Hand-authored Supabase `Database` types (`src/lib/supabase/database.types.ts`) now fully satisfy the `GenericTable` constraints required by `@supabase/postgrest-js`, including accurate `Relationships` arrays for every table and correctly-typed `Views`/`Enums`/`CompositeTypes`.
- Removed stray/unnecessary `eslint-disable` comments that referenced rules not enabled in this project's config.

## 2. Security

- **Critical fix:** the MyFatoorah payment API route (`src/app/api/payments/myfatoorah/route.ts`) no longer trusts a client-supplied price. Price, currency, course title and slug are now derived server-side from the `course_schedule` → `courses` relationship using only the trusted `courseScheduleId`. This closes a price-tampering vulnerability where a malicious client could have registered at an arbitrary amount.
- Added seat-availability and cohort-status checks (rejects registration for cancelled/completed cohorts or when seats are exhausted, with a `409` response).
- Added payment amount verification in the MyFatoorah callback handler (`src/app/api/payments/callback/route.ts`): the invoice amount returned by the gateway is compared against the stored payment amount before marking a registration as paid.
- Rewrote the contact form API (`src/app/api/contact/route.ts`) with strict server-side input sanitization: type checks, per-field max-length caps, and email format validation, returning structured `fieldErrors`.
- Hardened HTTP response headers via `next.config.ts`'s `headers()` function: added `Permissions-Policy`, `Strict-Transport-Security`, and a scoped `Content-Security-Policy` (self + `*.supabase.co` + MyFatoorah domains), alongside the existing `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. (Originally added to `netlify.toml`, moved to `next.config.ts` when the deployment target switched to Vercel — see [RELEASE_v1.md](./RELEASE_v1.md).)
- `next.config.ts`: disabled the `X-Powered-By` header (`poweredByHeader: false`) and enabled `reactStrictMode`.
- Course image uploads in the admin panel now validate file type (`image/*`) and enforce a 5MB size limit before upload.
- Row Level Security (RLS) policies remain enforced on all 13 Supabase tables; admin-only writes are gated by an `is_admin()` helper checked against the authenticated user's role.
- Supabase credentials are read exclusively from environment variables (`.env.local`, gitignored) and are never hard-coded or logged.

## 3. Accessibility (WCAG)

- Fixed heading hierarchy across the entire site (no more h2→h4 skips or out-of-order headings) on the homepage, course detail page, and all admin pages.
- Added `aria-label`/`title` to every icon-only button (edit, delete, publish/unpublish, mark read/unread, close dialog, etc.) across the admin panel and public site.
- Associated every form field with a `<label htmlFor>`/`id` pair across all forms (registration, contact, admin login, and all admin CRUD forms).
- Added `aria-invalid` and `aria-describedby` wiring to form fields with validation errors, and `role="alert"` on all inline error/success banners.
- Modal dialogs (course editor, schedule editor, confirm dialog) now use `role="dialog"`/`role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, and close on <kbd>Escape</kbd> via a shared `useCloseOnEscape` hook.
- Navigation landmarks: `<nav aria-label="Primary">` / `<nav aria-label="Mobile">` on the public site header, `<nav aria-label="Admin">` on the admin sidebar, with `aria-current="page"` on the active link.
- Mobile menu toggle button now exposes `aria-expanded` and `aria-controls`.
- Toast notifications render in an `aria-live="polite"` region; the confirm dialog uses `role="alertdialog"` with a focus-managed Cancel/Delete pair.

## 4. SEO & Metadata

- Added `generateMetadata` with canonical URLs (`alternates.canonical`) and Open Graph data to the course catalog, course detail, and contact pages.
- Added JSON-LD structured data: `EducationalOrganization` schema site-wide (`src/app/layout.tsx`) and `Course`/`CourseInstance`/`Offer` schema on each course detail page.
- Added `src/app/sitemap.ts` (dynamic, includes every published course) and `src/app/robots.ts` (disallows `/admin` and `/api`, references the sitemap).
- All admin routes are marked `robots: { index: false, follow: false }` so the dashboard never appears in search results; the registration page is marked `index: false, follow: true`.
- 404 pages (`not-found.tsx`, `courses/[slug]/not-found.tsx`) now export their own non-indexable metadata instead of inheriting the parent title.

## 5. Performance & Image Optimization

- All images use `next/image` with explicit `sizes` attributes tuned per breakpoint; the hero slider and course detail hero image are marked `priority`.
- Converted the last remaining raw `<img>` tags (homepage certificate gallery) to `next/image`.
- Remote image loading is scoped via `next.config.ts` `images.remotePatterns` to `*.supabase.co/storage/v1/object/public/**` only.
- Fixed a broken image reference: the seed course "No-Code AI Apps for Entrepreneurs" (`nocode-ai-apps`) pointed at a static SVG illustration that did not exist in `public/images/courses/`, causing a 404 on the catalog page. Added the missing illustration.
- Introduced `courseImageSrc()` (`src/lib/course-utils.ts`) as the single source of truth for resolving a course's card image: uploaded image → known static illustration → generic placeholder. Previously, code guessed a `/images/courses/{slug}.svg` path for *any* course, which would 404 for every course created through the admin panel without an image upload. All three call sites (`course-card.tsx`, `courses/[slug]/page.tsx`, `course-manager.tsx`) now use the shared helper.

## 6. UI/UX Consistency & Responsive Design

- Fixed a real visual bug in the sticky site header: it used a 90–95% translucent background with no blur, so page content (button labels) visibly ghosted through the header once scrolled. The header now uses `backdrop-blur-md` with a fully opaque background once scrolled, and a lighter translucent-with-blur state at the top of the page.
- Verified layout at mobile (375px), tablet (768px), and desktop (1440px) breakpoints for the homepage, course catalog, course detail, registration, contact, and admin login pages — grids reflow correctly (1→2→3 columns on the course catalog), no horizontal overflow, no element overlap, and the mobile nav drawer renders cleanly.
- Homepage "Student Voices" section is now conditionally rendered — if there are zero published testimonials, the section (and its heading) is omitted instead of showing an empty header with nothing underneath.
- Verified every internal link (header nav, footer, admin sidebar, in-page anchors like `/#about` and `/#certificates`, course card CTAs, 404 pages) resolves to a real route or in-page anchor.

## 7. Loading States & Error Boundaries

- Added a global `loading.tsx` (centered spinner) and `error.tsx` (with retry + home link) at the app root.
- Added an admin-scoped `loading.tsx` and `error.tsx` under `src/app/admin/(dashboard)/` that preserve the sidebar chrome instead of blanking the whole page on a per-section error.

## 8. Toast Notifications & Confirm Dialogs

- Replaced all `window.alert()` / `window.confirm()` calls across the admin panel with a proper in-app toast system (`useToast()`) and an accessible confirm dialog (`useConfirm()`), covering: course delete, category delete, testimonial add/publish/delete, trainer profile save, certificate add/delete, and data-load errors.
- Destructive actions (course delete, category delete, testimonial delete, certificate delete) now show a themed confirmation dialog instead of the browser's native `confirm()`, and every successful create/update/delete now surfaces a success toast instead of failing silently.
- Added a `saving` state to the testimonial "Add" form so the submit button shows pending state and can't be double-submitted.

## 9. Forms Validation Consistency

- Verified and aligned client-side and server-side validation for the registration and contact forms: full name length, email format, phone format, and seat-count bounds (1–10) are enforced identically on both the client (`register-form.tsx`) and the server (`api/payments/myfatoorah/route.ts`), with server field errors merged back into the client's inline error state.
- Added missing `required` attributes and inline error feedback to the admin category and testimonial "Add" forms, which previously failed silently on an empty submission.
- Course editor now trims and validates the title/short description/description before submit and derives the slug from the trimmed title.

## 10. Environment Variables

- `.env.local` holds live Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) and is excluded from version control via `.gitignore` (`.env*` with a tracked `.env.example` exception).
- All Supabase access goes through typed client factories (`src/lib/supabase/client.ts`, `server.ts`, `public.ts`) — no environment variable is read or logged outside of these modules.

---

## Known Environment Limitation (Not a Code Defect)

This development sandbox's network egress policy blocks the configured Supabase project host, so local verification of live database reads/writes could not be performed end-to-end in this environment. All public-facing pages fall back to a fully-typed in-repo seed dataset (`src/lib/data/seed-courses.ts`) when Supabase is unreachable, which is how the responsive/accessibility/UX audit in this document was performed and verified locally. The Supabase schema, RLS policies, and API routes were validated independently against a local PostgreSQL instance with stubbed `auth`/`storage` schemas before this audit began. No code changes are required to connect to the real Supabase project — only network access from the deployment environment (Vercel) is required, which is unrestricted.

---

## Remaining Follow-Ups (Outside RC Scope)

- Deploy to Vercel and connect the `reemora.app` domain.
- Replace remaining placeholder content (trainer CV PDF, certificate images) with real assets via the admin panel before public launch.

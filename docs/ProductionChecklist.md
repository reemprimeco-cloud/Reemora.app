# Production Readiness Checklist

Code-level readiness, verified as of this release. Infrastructure/deploy steps live separately in [DeploymentChecklist.md](./DeploymentChecklist.md) — this checklist covers "is the codebase itself production-grade," not "has it been deployed."

## Build & code quality

- [x] `npx tsc --noEmit` — zero errors
- [x] `npx next lint` — zero warnings, zero errors
- [x] `npm run build` — succeeds, all 30 routes generate (static + dynamic + SSG)
- [x] No `console.log` debugging statements left in shipped code (only intentional `console.error` for failure diagnostics)
- [x] No TODO/FIXME markers indicating incomplete work in security-sensitive paths

## Security

- [x] No secrets committed to git (`.env.local` gitignored; `.env.example` contains no real values)
- [x] Service-role Supabase key and MyFatoorah API key are server-only (never `NEXT_PUBLIC_`-prefixed, never referenced from a `"use client"` file)
- [x] Row Level Security enabled and policy-covered on all 13 database tables
- [x] Payment amount is derived server-side from the database, never trusted from client input
- [x] Payment callback verifies the gateway-reported amount against the stored amount before confirming
- [x] All API routes validate and bound-check every input field server-side (not just client-side)
- [x] Security headers configured: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- [x] File uploads (course images) validated for MIME type and size before upload
- [x] Admin routes are authenticated via middleware and fail closed (deny access) if the auth check itself errors

## Accessibility (WCAG)

- [x] Sequential heading hierarchy on every page (no skipped levels)
- [x] Every icon-only button has an accessible name (`aria-label`)
- [x] Every form field has an associated `<label>`
- [x] Form validation errors are announced via `role="alert"` and linked with `aria-describedby`
- [x] Modal dialogs use correct ARIA roles (`dialog`/`alertdialog`), trap focus semantics via `aria-modal`, and close on Escape
- [x] Navigation landmarks (`aria-label` on `<nav>`) and `aria-current="page"` on active links
- [x] Toast notifications live in an `aria-live="polite"` region

## SEO

- [x] Every public page has a unique `title`/`description` and canonical URL
- [x] Open Graph metadata on shareable pages
- [x] JSON-LD structured data (`EducationalOrganization`, `Course`) present
- [x] `sitemap.xml` and `robots.txt` generated dynamically
- [x] Admin and API routes excluded from indexing (`robots: noindex`, disallowed in `robots.txt`)

## Performance

- [x] All images use `next/image` with tuned `sizes`; hero/above-the-fold images marked `priority`
- [x] Remote image sources restricted to the Supabase storage domain (no open image proxy)
- [x] Course detail and registration pages statically generated at build time (`generateStaticParams`)
- [x] No known broken image references (verified via a full crawl of course image paths)

## UX & resilience

- [x] Global and admin-scoped `loading.tsx` / `error.tsx` boundaries in place
- [x] Every destructive admin action requires confirmation (no accidental deletes)
- [x] Every create/update/delete action surfaces a success or error toast — nothing fails silently
- [x] Every list view has a defined empty state (no blank/broken-looking screens)
- [x] The public site degrades gracefully (seed-data fallback) rather than 500ing if Supabase is temporarily unreachable
- [x] Verified responsive at mobile (375px), tablet (768px), and desktop (1440px) breakpoints on every public page and the admin login

## Data integrity

- [x] Financial tables (`registrations`, `payments`, `payment_transactions`) have no public write path — writable only by server-side, service-role code after independent validation
- [x] Every foreign key has an explicit `on delete` behavior (`cascade` or `set null`) — no orphaned-row surprises
- [x] Check constraints enforce valid enum values and non-negative amounts/seats at the database level, not just in application code

## Known limitations (documented, not blockers)

- No automated test suite yet (see [ProjectRoadmap.md](./ProjectRoadmap.md#future-ideas-not-scheduled))
- No transactional email (registration confirmations, admin notifications) — the admin panel must be checked manually for new registrations/messages
- No self-serve admin password reset flow (requires a Supabase dashboard action)
- Refund handling has a database status (`payments.status = 'refunded'`) but no UI/API trigger yet — refunds are processed in the MyFatoorah dashboard and reflected manually

## Sign-off

This checklist reflects the state audited and verified during the Release Candidate pass (see [RELEASE_NOTES.md](../RELEASE_NOTES.md)) and this release package (see [RELEASE_v1.md](../RELEASE_v1.md)). The codebase is production-ready pending the infrastructure steps in [DeploymentChecklist.md](./DeploymentChecklist.md).

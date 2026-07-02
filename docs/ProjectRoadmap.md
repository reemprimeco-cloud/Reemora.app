# Project Roadmap

## Completed

### Phase 1 — Static site
Initial marketing site (hero, CV/About, certificates, course catalog, course details, registration + MyFatoorah flow, admin panel) built as static HTML/CSS/JS.

### Phase 2 — Production platform rebuild
Rebuilt from scratch as a production Next.js 15 + TypeScript + Tailwind CSS application:
- Supabase-backed data layer with a seed-data fallback for offline/degraded operation
- Supabase Auth-gated admin panel (CRUD for courses, categories, scheduling, trainer/certificates, testimonials, contact messages, site settings)
- Registration flow with server-derived pricing and MyFatoorah payment integration
- Dark/light mode, responsive design, SEO metadata

### Phase 3 — Database
Full 13-table Supabase schema designed, migrated, and validated end-to-end against a local Postgres instance before handoff: tables, indexes, triggers, RPC functions, Row Level Security policies for every table, storage buckets, and seed data. Hand-authored Supabase TypeScript types wired through the entire data-access layer.

### Phase 4 — Release Candidate audit
Full-platform audit and hardening pass (no new features) covering:
- TypeScript/ESLint — zero errors, zero warnings
- Security — closed a client-side price-tampering vulnerability in the payment API, added payment amount verification on the callback route, hardened HTTP security headers, added upload validation
- Accessibility (WCAG) — heading hierarchy, ARIA labeling, label associations, dialog semantics, keyboard (Escape) support
- SEO — canonical URLs, Open Graph, JSON-LD structured data, sitemap/robots, admin noindex
- Performance/images — `next/image` everywhere with tuned `sizes`, fixed a broken course image reference, removed a slug-guessing image path that would 404 for any course created without an upload
- Loading states & error boundaries — global and admin-scoped
- Toast notifications & confirm dialogs — replaced all native `alert()`/`confirm()` with an accessible in-app equivalent
- Forms validation consistency — client/server validation parity verified and aligned
- Empty states & broken links — verified every internal link resolves; hid the testimonials section entirely when there's no published content instead of showing an empty heading
- Responsive design — verified at mobile/tablet/desktop breakpoints; fixed a translucent-header text-ghosting bug on scroll

See [RELEASE_NOTES.md](../RELEASE_NOTES.md) for the full itemized list.

### Phase 5 — Documentation
This `/docs` set: Architecture, Database, Deployment, Admin Guide, API reference, Developer Guide, and this roadmap.

## In progress / next up

- **Deploy to Netlify and connect the `reemora.app` domain** — the app is deploy-ready (`netlify.toml` configured); this is the last step before public launch. See [Deployment.md](./Deployment.md).
- **Replace placeholder content** — trainer CV PDF, certificate images, at least one real course photo — via the admin panel per [AdminGuide.md](./AdminGuide.md#content-to-replace-before-launch).
- **Live end-to-end payment verification** — a real registration should be run against the MyFatoorah **test** environment post-deploy before switching to live keys.

## Future ideas (not scheduled)

These are reasonable next investments once the platform is live, not commitments:

- **Automated tests** — no test suite exists yet. A good starting point would be integration tests for the two API routes (`/api/payments/myfatoorah`, `/api/contact`) covering the validation branches, since those are the highest-risk surfaces (money, user input).
- **Email notifications** — confirmation emails to students on successful registration, and a notification to the admin inbox setting when a new contact message or registration arrives. Currently registrations/messages are only visible by checking the admin panel.
- **Password reset flow** — admin password changes currently require either being signed in already (Settings page) or a manual reset via the Supabase dashboard.
- **Portfolio section** — the `portfolio` table already exists in the schema but isn't surfaced in the UI yet; low effort to add a public section and admin manager mirroring the testimonials pattern.
- **Course capacity waitlist** — currently a full cohort simply can't be registered for (`409`); a waitlist would capture that demand instead of turning it away.
- **Multi-instructor courses** — the schema currently supports one `instructor_id` per course; multiple instructors per course would need a join table.
- **Refund handling** — `payments.status` already has a `'refunded'` value in its check constraint, but there's no UI or API path to trigger one yet; refunds currently have to be handled directly in the MyFatoorah dashboard and then reflected manually in Supabase.
- **Rich text course descriptions** — descriptions are currently plain text; a lightweight rich-text/markdown editor would allow richer formatting without a full CMS.

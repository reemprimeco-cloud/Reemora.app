# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** founders and entrepreneurs in Kuwait and the wider GCC who are non-technical or semi-technical and want to build and launch their own AI app or product. They arrive from Instagram, WhatsApp referrals or word of mouth, usually on a phone, deciding whether a cohort is worth their time and money (prices are in KWD, typically 180–450 KWD per course). Their job: pick a course, trust the trainer, reserve or pay, show up, and leave with something that works.

**Secondary (confirmed, not primary):** working developers upskilling in AI agents and prompt engineering, and companies booking private or corporate sessions for their teams. When the two conflict with the primary user, the founder wins.

**After the course:** the same people become members of the Reemora Lounge, a members-only community, where they keep building, show projects, ask questions and enter challenges.

## Product Purpose

Reemora is a training platform and community for building AI applications. The public site sells and schedules cohort-based courses (catalog, course detail with multiple cohorts, seat reservation without payment, registration with MyFatoorah payment, waitlist for full cohorts, private-session and corporate inquiries, contact, post-course feedback). An admin panel manages courses, categories, schedules, trainer profile and certificates, testimonials, portfolio, site settings, messages, registrations, and the Lounge (members, invitations, moderation, achievements, challenges, audit log).

Success for the business: full cohorts, paid registrations, and graduates who stay active in the Lounge and come back for the next course. Success for a participant: a deployed, working app by the end of the course and a community that keeps them building.

## Positioning

All four claims below are confirmed true and binding. Future work may lean on them; it must not dilute or contradict them.

1. **Taught by a founder who ships real products.** The trainer has launched and still runs live products (Shlon, Prime Rewards, Prime Fit, Prime HR). Participants learn from someone who builds, not only teaches.
2. **Internationally certified professional trainer.** The trainer holds an internationally recognised training and instructional-design credential (International Certified Trainer, plus AI product and curriculum design, and professional training and facilitation).
3. **Genuinely bilingual Arabic and English.** Courses, site, forms and the Lounge work natively in both languages with RTL support; Arabic is first-class, not a translated afterthought.
4. **Build-first: graduate with a working app, then keep building in the Lounge.** Every participant leaves with a deployed project, and the Lounge community continues the work after the cohort ends.

## Operating Context

- Anchored in Kuwait: KWD currency with three decimals, +965 phone numbers, Kuwait City venue ("Reemora HQ, Kuwait City" for in-person cohorts), Kuwait cultural calendar for scheduling.
- Cohorts have fixed dates, seat counts and a status (open, full, cancelled, completed). Seat availability is derived server-side and drives whether a visitor can register, reserve or join a waitlist.
- Payment runs through MyFatoorah; a WhatsApp follow-up path exists for reservations and payment links. Registrations, reservations, inquiries and feedback all land in the admin panel.
- Admins are Supabase-authenticated users with the `admin` role. The Lounge adds a membership layer (pending, approved, rejected, suspended) on top of the same accounts, with admin approval and email or link invitations for past registrants.
- The Lounge has one public real-time chat room and no private messaging, by rule.
- The site is installable as a PWA with an offline fallback and optional web push for members and admins.
- Deployed on Vercel at https://www.reemora.app (the canonical host is `www`); data in Supabase (Postgres, Auth, Storage).

## Capabilities and Constraints

- **Stack (existing):** Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4 with CSS-variable tokens, next-themes for light and dark mode, lucide-react icons, zod validation, Supabase SSR client, web-push.
- **Languages:** English and Arabic dictionaries drive every public and Lounge surface; `dir` flips to RTL for Arabic. Arabic copy is natural Modern Standard Arabic.
- **Terminology:** "course" and "cohort" (a course can have several scheduled cohorts); "trainer" not "instructor" in public copy; "Lounge" (المجتمع) for the community; "member" for approved Lounge users; "challenge" for community competitions; "reserve" means a no-payment seat hold, "register" means paid enrolment.
- **Security constraints that future UI must respect:** prices are derived server-side and never trusted from the client; the service-role key never reaches the browser; authorization is enforced in API routes and row-level security, not only in the UI; migrations are additive and reversible.
- **Known gaps (facts, not plans):** no automated test suite; emails rely on Supabase's built-in sender until custom SMTP is configured; `NEXT_PUBLIC_SITE_URL` is not set in production, so routes fall back to the request origin.
- **Undecided:** whether courses are delivered in person, online or hybrid is per-cohort data, not a fixed product fact; do not assume one format site-wide.

## Brand Commitments

- **Name:** Reemora. Tagline in use: "Build Apps with AI".
- **Trainer identity:** Reem is the founder and lead trainer and may be named and shown by photo on the site. The seed placeholder "Reemora Certified Trainer" is to be replaced with her real name and photo through the admin panel; until then it is a placeholder, not a fact.
- **Voice:** direct, confident, warm, no hype. Speaks to the reader as a capable adult who wants to build. Arabic and English carry equal weight.
- **Assets on hand:** logo at `public/images/logo.png`; PWA icons under `public/icons/`; course illustrations under `public/images/courses/` (SVG placeholders pending real photos); portfolio marks under `public/images/portfolio/` (Shlon, Prime Rewards, Prime Fit, Prime HR).
- **Existing visual system:** an incumbent navy and blue palette, Poppins for headings, Inter for body, Tajawal for Arabic, defined in `src/app/globals.css` and `src/app/layout.tsx`. Recorded here as a fact of the codebase, not as a design decision for future surfaces.

## Evidence on Hand

Confirmed real and publishable:

- The trainer's certifications listed on the About page are real and verifiable.
- The portfolio projects (Shlon, Prime Rewards, Prime Fit, Prime HR) are live products built by the trainer.
- Published testimonials come from real past participants. None are invented.

Absences future work must not fabricate:

- No student counts, completion rates, revenue figures or press coverage exist as verified numbers. The homepage stats block must use real admin-entered values or be hidden.
- No real course photography yet; current course images are SVG placeholders.
- No trainer photo or CV PDF uploaded yet.
- No named corporate clients or partner logos.

## Product Principles

1. **The founder's credibility is the product.** Every surface should make it obvious who teaches, what she has shipped and what she is certified in. Proof over promises.
2. **Build-first, always.** Copy, structure and community features should push toward making and shipping something, not consuming content.
3. **Arabic and English are peers.** Nothing ships in one language only; layout, forms and community features must read naturally in RTL.
4. **Kuwait is the default, not a localisation.** Currency, phone, calendar, venue and payment habits are built in, not configured.
5. **Trust is enforced, not decorated.** Server-side pricing, real authorization, additive migrations and honest status reporting are part of the product promise to participants and admins alike.

## Accessibility & Inclusion

- WCAG-aligned baseline already audited: heading hierarchy, labelled form fields, ARIA on icon-only controls, dialog semantics with Escape to close, live regions for toasts, keyboard-reachable navigation, light and dark themes.
- Bilingual RTL support is an accessibility requirement here, not a feature: Arabic readers are a primary audience.
- Mobile-first: the primary user arrives on a phone.

# Reemora — Build Apps with AI

A complete, static website for Reemora: dynamic homepage, course catalog, course registration with MyFatoorah payments, admin panel with course/schedule management. Built with plain HTML, CSS and JavaScript — no build step required.

## What's included

| Page | Purpose |
|---|---|
| `index.html` | Homepage — hero slider, features, featured courses, About/CV section, certificates, testimonials |
| `courses.html` | Full course catalog with search + filters |
| `course-details.html?id=<courseId>` | Single course details page |
| `register.html?course=<courseId>` | Registration form → MyFatoorah checkout |
| `admin.html` | Password-protected admin panel: course CRUD, scheduling, registrations, settings |

Shared code lives in `css/style.css` and `js/*.js`. `js/data.js` is the single data layer every page reads/writes through.

## Quick start (local preview)

No build tools needed. From the project root:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Course data, registrations and the admin password are stored in the browser's `localStorage`/`sessionStorage`, seeded automatically on first load.

**Default admin password:** `Reemora@2026` — go to `admin.html`, log in, then change it under **Settings**.

## Important architecture note

This site is deliberately **static-first** so it can be deployed anywhere instantly (Netlify, GitHub Pages, S3, any static host). Two things that a real production system needs are called out explicitly so nothing is silently insecure:

1. **Admin data storage.** Courses/registrations are stored in `localStorage`, which is per-browser and not shared across devices or admins. This is fine for a single-admin preview/launch. When you're ready to scale (multiple admins, real persistence, image hosting), swap the internals of `ReemoraStore` in `js/data.js` for calls to a real backend (e.g. Supabase) — every page already only talks to `ReemoraStore`'s methods, so no other file needs to change.
2. **MyFatoorah payments.** A payment API key must never live in client-side JavaScript. `register.html` calls `/.netlify/functions/myfatoorah-payment`, a serverless function (`netlify/functions/myfatoorah-payment.js`) that holds the key server-side. Until that function is deployed with real credentials, the registration form will save the registration locally and show a friendly "we'll follow up" message instead of failing silently.

## Deploying with real MyFatoorah payments (Netlify)

1. Push this repo to GitHub/GitLab and connect it to a new Netlify site (or run `netlify deploy` from the CLI).
2. In the MyFatoorah merchant portal, generate an API key (start with the **test** key).
3. In Netlify: **Site settings → Environment variables**, add:
   - `MYFATOORAH_API_KEY` — your MyFatoorah API key
   - `MYFATOORAH_BASE_URL` — `https://apitest.myfatoorah.com` for testing, `https://api.myfatoorah.com` for live
   - `SITE_URL` — your deployed site URL (e.g. `https://reemora.netlify.app`)
4. Redeploy. `netlify.toml` already points Netlify at `netlify/functions` — no extra config needed.
5. Test a registration end-to-end using MyFatoorah's test cards before switching to the live API key and base URL.

If you deploy to a host other than Netlify, port `netlify/functions/myfatoorah-payment.js` to that platform's serverless function format (the MyFatoorah API call itself stays the same) and update the `fetch` URL in `js/register.js`.

## Content you should replace before launch

- **`images/logo.png`** — already set from the provided logo.
- **CV section (`index.html`, `#about`)** — currently placeholder bio/timeline text and a placeholder photo frame. Replace the copy with your real bio, and replace `images/cv/reemora-cv.pdf` with your actual CV PDF (same filename, or update the `href` in `index.html`).
- **Certificates section (`index.html`, `#certificates`)** — currently placeholder cards. Add your real certificate images to `images/certificates/` and update the three `.cert-card` blocks in `index.html` with real titles, issuing bodies and `<img>` tags pointing at your files.
- **Course images** — admin can upload images per course directly from `admin.html` (stored as embedded image data). A few branded placeholder SVGs ship in `images/courses/` for courses without an uploaded image.
- **Contact details / social links** — footer in every page currently has placeholder email, phone and social links.

## Admin panel guide

Go to `admin.html` and log in with the admin password.

- **Dashboard** — quick KPIs and recent registrations.
- **Courses** — add, edit, delete courses. Upload a course image, set price/currency/duration/seats, write the short + full description and curriculum (one line per topic).
- **Scheduling** — set/adjust each course's start date, end date, session days, session time and status (upcoming / ongoing / completed) independently from editing the course content.
- **Registrations** — every submitted registration, with payment status.
- **Settings** — change the admin password (stored locally in the browser).

All changes made in the admin panel are reflected immediately on `courses.html`, `course-details.html` and the homepage's featured courses, since they all read from the same `ReemoraStore`.

## Browser support

Modern evergreen browsers (Chrome, Safari, Firefox, Edge). Uses `IntersectionObserver` for scroll animations with a graceful fallback, and CSS Grid/Flexbox throughout.

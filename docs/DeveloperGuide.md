# Developer Guide

## Prerequisites

- Node.js 20+
- A Supabase project (optional for local dev — the app runs on seed data without one)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase + UPayments values, or leave blank to use seed data
npm run dev                  # http://localhost:3000
```

```bash
npm run build   # production build (includes type checking)
npm run lint     # ESLint (flat config, eslint-config-next)
npx tsc --noEmit # standalone type check, faster iteration than a full build
```

Without Supabase env vars set, the app runs entirely against `src/lib/data/seed-courses.ts` and `/admin` is **unauthenticated** (middleware skips the auth check) — convenient for UI work, but never deploy in this state. See [Architecture.md](./Architecture.md#data-access-fallback-pattern).

## Project conventions

### Styling
Tailwind CSS v4, configured CSS-first in `src/app/globals.css` via `@theme inline` (no `tailwind.config.js`). Color tokens (`--surface`, `--surface-alt`, `--border-c`, `--ink-soft`, etc.) are defined per color-scheme and consumed as `bg-surface`, `text-ink-soft`, etc. Dark mode is a `.dark` class variant applied by `next-themes`; always use the semantic tokens rather than hard-coded `bg-white`/`bg-black` so components stay theme-aware.

### Data access
Never import `src/lib/supabase/server.ts` (cookie-based) into a component that might run during static generation (e.g. anything reachable from `generateStaticParams`). Use `src/lib/supabase/public.ts` for public reads instead — see the `getCourseBySlug` / `getCourses` pattern in `src/lib/data/courses.ts`. Every public data-fetching function should fall back to the matching seed-data export on error, following the existing pattern in `src/lib/data/*.ts`.

### Client/server boundary for shared helpers
Pure helpers used by both server-rendered pages and `"use client"` components (e.g. `primarySchedule`, `courseImageSrc`) live in `src/lib/course-utils.ts`, which has **zero** dependencies on `next/headers` or the Supabase server client. If you add a helper that's imported from a client component, keep it in a dependency-free module like this one — importing the cookie-based server client from a client-component's import graph will break the build (`cookies() was called outside a request scope`).

### Admin CRUD components
Admin list/editor components (`src/components/admin/*.tsx`) are `"use client"` and talk to Supabase directly via `createClient()` (browser client) using the signed-in admin's session — RLS enforces the actual access control, so these components don't need to re-check permissions client-side.

Use the shared UX primitives instead of native browser dialogs:
- `useToast()` from `@/components/toast-provider` — `showToast("success" | "error", message)` for any create/update/delete outcome.
- `useConfirm()` from `@/components/confirm-dialog` — `await confirm(message, title?)` returns a `Promise<boolean>`; use it before any destructive action instead of `window.confirm()`. Never use `window.alert()`/`window.confirm()` directly — they're inaccessible and inconsistent with the rest of the UI.

### Forms
Client-side validation should mirror server-side validation exactly (see `register-form.tsx` / `api/payments/upayments/route.ts` for the reference pattern): same regexes, same bounds, and the client should merge any `fieldErrors` returned by the server back into its own error state so server-side rejections still highlight the right field. Every field needs a `<label htmlFor>` paired with a matching `id`, and error banners need `role="alert"`.

### Images
Always use `next/image`, always pass `sizes`. For course cards/detail images, use `courseImageSrc()` (`src/lib/course-utils.ts`) rather than guessing a path from the course slug — see [Architecture.md](./Architecture.md) for why. `next.config.ts` only allows remote images from `*.supabase.co/storage/v1/object/public/**`; if you need another remote host, add it to `images.remotePatterns` deliberately.

### Accessibility baseline
Every new interactive element needs an accessible name (`aria-label` for icon-only buttons), every modal needs `role="dialog"`/`"alertdialog"`, `aria-modal="true"`, `aria-labelledby`, and Escape-to-close via `useCloseOnEscape` (`src/lib/use-close-on-escape.ts`). Keep heading levels sequential within a page (no skipping from `h2` to `h4`).

## Common tasks

### Add a new public page
Add a `page.tsx` under `src/app/`, export `metadata` (or `generateMetadata`) with at minimum a `title`, `description`, and `alternates.canonical`, and add the route to `src/app/sitemap.ts` if it should be indexed.

### Add a new admin section
1. Add a route under `src/app/admin/(dashboard)/<name>/page.tsx` — a server component that fetches initial data and exports `metadata = { title: "..." }`.
2. Add a `"use client"` manager component under `src/components/admin/` following the pattern in `category-manager.tsx` (simplest reference) — local state seeded from `initialX` props, Supabase browser client for writes, `useToast`/`useConfirm` for feedback.
3. Add the route + icon to `LINKS` in `src/components/admin/admin-sidebar.tsx`.
4. If the section needs a new table, add a migration under `supabase/migrations/`, update `supabase/schema.sql`, `database.types.ts`, and `src/lib/types.ts`.

### Add a new database table/column
1. Add a new numbered file under `supabase/migrations/` (don't edit past migrations — they're the historical record; a fresh project applies `schema.sql` in one shot, but treat migrations as append-only going forward).
2. Regenerate `supabase/schema.sql` by concatenating all migration files in order.
3. Update `src/lib/supabase/database.types.ts` (or regenerate via `supabase gen types typescript`, see [Database.md](./Database.md#regenerating-types-after-a-schema-change)) — remember every table needs a `Relationships: [...]` array, or `@supabase/postgrest-js`'s generic types silently degrade to `never`.
4. Add/extend RLS policies for the new table before shipping — an RLS-enabled table with no policies denies all access by default, and a table with RLS disabled is publicly readable/writable.

## Testing checklist before a PR

There's no automated test suite yet (see [ProjectRoadmap.md](./ProjectRoadmap.md)). Before merging:

```bash
npx tsc --noEmit
npx next lint
npm run build
```

Then manually exercise the change in the browser — for UI changes, check both light and dark mode, and at least a mobile (375px) and desktop (1440px) viewport width. For anything touching the payment or contact flow, test the full happy path plus at least one validation-error path.

## Debugging Supabase connectivity

`isSupabaseConfigured` (`src/lib/data/seed-courses.ts`) is `true` only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Every data-fetch function logs a `console.error` with the function name and underlying error before falling back to seed data — check the terminal (dev) or Vercel → Deployments → Logs (production) for these when a page renders seed data unexpectedly.

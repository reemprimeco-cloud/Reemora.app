# Environment Variables

All variables the application reads, verified against the source (`grep -r process.env` across `src/`, `next.config.ts`, `middleware.ts`). Template lives at `.env.example`; real values go in `.env.local` (gitignored) locally, or your host's environment variable settings in production.

| Variable | Required | Public? | Used in | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public (browser-exposed) | `src/lib/supabase/client.ts`, `server.ts`, `public.ts`, `middleware.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public (browser-exposed) | `src/lib/supabase/client.ts`, `server.ts`, `public.ts`, `middleware.ts` | Supabase anonymous key — safe to expose; Row Level Security enforces access control, not this key's secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret — server only** | `src/lib/supabase/server.ts` (`createServiceRoleClient`) | Bypasses RLS; used only inside `/api/payments/*` and `/api/contact` route handlers for trusted, server-validated writes. Never expose to the client or commit to git. |
| `MYFATOORAH_API_KEY` | Yes | **Secret — server only** | `src/lib/myfatoorah.ts` | Authenticates requests to the MyFatoorah payment API |
| `MYFATOORAH_BASE_URL` | Yes | Server only | `src/lib/myfatoorah.ts` | `https://apitest.myfatoorah.com` (test) or `https://api.myfatoorah.com` (live) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public | `src/app/api/payments/myfatoorah/route.ts`, `src/app/sitemap.ts`, page metadata | Canonical site URL — used for SEO metadata, the sitemap, and MyFatoorah's payment callback/error redirect URLs. Set to `https://reemora.app` in production. |

Every variable above is required for full functionality. If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, the app degrades gracefully to an in-repo seed dataset and the admin panel becomes unauthenticated — **this is a development convenience, not a supported production mode.** See [Architecture.md](./Architecture.md#data-access-fallback-pattern).

## Setting them

**Local development:**
```bash
cp .env.example .env.local
# fill in real values
```

**Production (Vercel):** Project Settings → Environment Variables → add each of the six above (mark `SUPABASE_SERVICE_ROLE_KEY` and `MYFATOORAH_API_KEY` as Sensitive). See [Deployment.md](./Deployment.md) and [DeploymentChecklist.md](./DeploymentChecklist.md).

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and `MYFATOORAH_API_KEY` must **never** be prefixed with `NEXT_PUBLIC_` — that prefix is Next.js's signal to inline a value into the browser bundle. Both are read only from server-side code (API routes / server components), never from a `"use client"` component.
- **Do not mark `NEXT_PUBLIC_*` variables as "Sensitive" in Vercel.** They're already public by design (baked into the browser-visible JS bundle at build time regardless), so Sensitive mode gains nothing — but it also makes Vercel permanently hide the value from you, including your own future edits/verification. Only `SUPABASE_SERVICE_ROLE_KEY` and `MYFATOORAH_API_KEY` should be Sensitive.
- `.env.local` is excluded from version control via `.gitignore` (`.env*` with a tracked `.env.example` exception that contains no real values).
- No environment variable value has ever been printed to chat, logs beyond `console.error`'s generic connection-failure messages, or committed to this repository.

## Troubleshooting: "Incorrect email or password" on `/admin/login` despite a confirmed, correctly-promoted account

If `auth.users.email_confirmed_at` is set and `public.users.role = 'admin'` but sign-in still fails, check whether `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` were marked **Sensitive** in Vercel. A Sensitive value can never be redisplayed for verification — if it was set incorrectly even once, there's no way to visually confirm or diagnose it afterward, and the app will keep failing to authenticate against the wrong project while returning a generic (and misleading) "Incorrect email or password" response. Fix: delete and recreate the variable with the correct value from Supabase → Settings → Data API (URL) / API Keys (anon/publishable key), without marking it Sensitive, then redeploy.

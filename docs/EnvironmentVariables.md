# Environment Variables

All variables the application reads, verified against the source (`grep -r process.env` across `src/`, `next.config.ts`, `middleware.ts`). Template lives at `.env.example`; real values go in `.env.local` (gitignored) locally, or your host's environment variable settings in production.

| Variable | Required | Public? | Used in | Purpose |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public (browser-exposed) | `src/lib/supabase/client.ts`, `server.ts`, `public.ts`, `middleware.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public (browser-exposed) | `src/lib/supabase/client.ts`, `server.ts`, `public.ts`, `middleware.ts` | Supabase anonymous key — safe to expose; Row Level Security enforces access control, not this key's secrecy |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret — server only** | `src/lib/supabase/server.ts` (`createServiceRoleClient`) | Bypasses RLS; used only inside `/api/payments/*` and `/api/contact` route handlers for trusted, server-validated writes. Never expose to the client or commit to git. |
| `UPAYMENTS_API_KEY` | Yes | **Secret — server only** | `src/lib/upayments.ts` | Bearer token for the UPayments API (sandbox or live key) |
| `UPAYMENTS_BASE_URL` | Yes | Server only | `src/lib/upayments.ts` | `https://sandboxapi.upayments.com/api/v1` (test) or `https://apiv2api.upayments.com/api/v1` (live) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public | `src/lib/payments/checkout.ts`, `src/app/sitemap.ts`, page metadata | Canonical site URL — used for SEO metadata, the sitemap, UPayments return/notification URLs and the `/pay/…` links in reminder messages. Set to `https://reemora.app` in production. |
| `CRON_SECRET` | Yes (prod) | **Secret — server only** | `src/app/api/payments/installments/remind/route.ts` | Vercel sends it as `Authorization: Bearer …` when running the daily reminder cron; the route rejects anything else |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | For reminders | **Secret — server only** | `src/lib/sms.ts` | Twilio credentials for installment reminder messages. Without them reminders are skipped and the admin gets a Telegram list instead |
| `TWILIO_FROM` | For reminders | Server only | `src/lib/sms.ts` | Sender: an SMS number (`+1…`) or `whatsapp:+…` to deliver over WhatsApp |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Optional | **Secret — server only** | `src/lib/telegram.ts` | Admin notifications (new registrations, payments, reminder summaries) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Optional | Public / **Secret** / Server | `src/lib/webpush.ts` | Web Push to admin devices |

The Supabase, UPayments, site URL and `CRON_SECRET` variables are required for full functionality; the rest degrade gracefully when absent. If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, the app degrades gracefully to an in-repo seed dataset and the admin panel becomes unauthenticated — **this is a development convenience, not a supported production mode.** See [Architecture.md](./Architecture.md#data-access-fallback-pattern).

## Setting them

**Local development:**
```bash
cp .env.example .env.local
# fill in real values
```

**Production (Vercel):** Project Settings → Environment Variables → add each of the above (mark `SUPABASE_SERVICE_ROLE_KEY`, `UPAYMENTS_API_KEY`, `CRON_SECRET`, `TWILIO_AUTH_TOKEN` and `VAPID_PRIVATE_KEY` as Sensitive). See [Deployment.md](./Deployment.md) and [DeploymentChecklist.md](./DeploymentChecklist.md).

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and `UPAYMENTS_API_KEY` (and the other secrets) must **never** be prefixed with `NEXT_PUBLIC_` — that prefix is Next.js's signal to inline a value into the browser bundle. Both are read only from server-side code (API routes / server components), never from a `"use client"` component.
- **Do not mark `NEXT_PUBLIC_*` variables as "Sensitive" in Vercel.** They're already public by design (baked into the browser-visible JS bundle at build time regardless), so Sensitive mode gains nothing — but it also makes Vercel permanently hide the value from you, including your own future edits/verification. Only the secrets listed above should be Sensitive.
- `.env.local` is excluded from version control via `.gitignore` (`.env*` with a tracked `.env.example` exception that contains no real values).
- No environment variable value has ever been printed to chat, logs beyond `console.error`'s generic connection-failure messages, or committed to this repository.

## Troubleshooting: "Incorrect email or password" on `/admin/login` despite a confirmed, correctly-promoted account

If `auth.users.email_confirmed_at` is set and `public.users.role = 'admin'` but sign-in still fails, check whether `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` were marked **Sensitive** in Vercel. A Sensitive value can never be redisplayed for verification — if it was set incorrectly even once, there's no way to visually confirm or diagnose it afterward, and the app will keep failing to authenticate against the wrong project while returning a generic (and misleading) "Incorrect email or password" response. Fix: delete and recreate the variable with the correct value from Supabase → Settings → Data API (URL) / API Keys (anon/publishable key), without marking it Sensitive, then redeploy.

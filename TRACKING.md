# Meta Pixel + Conversions API

Browser pixel plus server-side Conversions API (CAPI), deduplicated by a shared `event_id`. Everything is off until `NEXT_PUBLIC_META_PIXEL_ID` is set.

## Environment

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Vercel, all environments | Numeric pixel/dataset id. Empty = fully inert (no script, no network calls, no errors). Inlined at build time, so **redeploy after changing it**. |
| `META_CAPI_ACCESS_TOKEN` | Vercel, **Sensitive** | Events Manager → your dataset → Settings → Conversions API → Generate access token. Server-only; never add a `NEXT_PUBLIC_` prefix. Without it the pixel still works, server events are skipped. |
| `META_TEST_EVENT_CODE` | Preview / local only | Code from Events Manager → Test Events. When set, server events show up in Test Events instead of counting as live. **Do not set in Production.** |
| `META_GRAPH_API_VERSION` | optional | Defaults to `v24.0`. |

The site's Content-Security-Policy (`next.config.ts`) allows `connect.facebook.net` (script) and `www.facebook.com` / `connect.facebook.net` (beacons).

## Event map

| Event | Fires where | Sent by | `event_id` | Params |
|---|---|---|---|---|
| `PageView` | Every public page: first load (base snippet) + every client-side navigation (`components/meta-pixel.tsx`). Not on `/admin`. | Browser only | pixel default | — |
| `ViewContent` | Course detail page `/courses/[slug]` (`components/meta-view-content.tsx`), once per view | Browser + server | random UUID, shared | `content_name`, `content_ids:[course id]`, `content_type:'product'`, `value`, `currency` |
| `Lead` | Successful submit of: contact form, course inquiry ("Ask a question"), waitlist, private-session request, seat reservation (`/reserve`) | Browser + server | random UUID, shared | `content_category` (`contact_form` / `course_inquiry` / `waitlist` / `private_session` / `seat_reservation`), `content_name` + `content_ids` when tied to a course; email/phone hashed server-side |
| `InitiateCheckout` | Registration form passes validation and is submitted, just before redirect to payment (`components/register-form.tsx`) | Browser + server | random UUID, shared | `content_name`, `content_ids`, `content_type`, `value` (amount due now), `currency`, `num_items` (seats) |
| `CompleteRegistration` | Course registration saved by `POST /api/payments/checkout` (both UPayments and WhatsApp-manual modes) | **Server only** | `reg_<registration id>` | `content_name`, `content_ids`, `content_type`, `value` (order total), `currency`, `num_items` |
| `Purchase` | Payment confirmed **server-side** by UPayments status lookup, in `applyTransaction` (`lib/payment-reconciliation.ts`) — reached from the return redirect, the UPayments webhook, the admin sweep and the daily cron | **Server only** | `purchase_<payment id>` | `value` (amount captured, 3 decimals), `currency`, `content_ids`, `content_name`, `content_type`, `num_items`, `order_id` (registration id) |

### Purchase rules
- Never sent from the browser, and never from the `?status=success` redirect alone; only after UPayments confirms the charge and the amount matches what was billed.
- Sent only on the transition into `paid`. A refreshed callback, a re-delivered webhook or a later sweep sees the payment as already paid and sends nothing. The deterministic `event_id` makes Meta drop a duplicate even if two requests race.
- Split-payment plans send one Purchase per installment as each is paid (50% each), so reported revenue matches money received.
- WhatsApp-manual payments confirmed by staff in the admin table are **not** sent (no gateway verification).

### Matching data
- Server events include `client_ip_address`, `client_user_agent`, `fbp` (`_fbp` cookie) and `fbc` (`_fbc` cookie, or built from `fbclid` on the page URL when the cookie isn't set yet).
- Email: trimmed + lowercased, then SHA-256. Phone: digits only, E.164 with `965` added to 8-digit Kuwaiti numbers, then SHA-256. Hashing happens on our server; raw values are never sent to Meta.
- `Purchase` can be confirmed by the webhook with no browser attached, so the buyer's browser signals (IP, user agent, fbp, fbc) are saved at checkout in `payment_transactions.raw_response.meta` (admin-only table) and reused.

### Reliability
- CAPI calls run after the response is sent (`next/server` `after`), so tracking never delays a page, a form or a payment redirect.
- 4 s timeout per attempt, up to 3 attempts with backoff on network errors/timeouts/5xx; 4xx is logged once and dropped.
- Logs contain only the event name, event id and Meta's error message. No email, phone or token.
- `POST /api/meta/capi` (the browser mirror) only accepts `ViewContent`, `Lead` and `InitiateCheckout`, validates the event id, keeps only known `custom_data` fields, and is rate-limited per IP. `Purchase`/`CompleteRegistration` can't be forged through it.

### Not tracked
- **WhatsApp click**: the public site currently has no click-to-chat WhatsApp link. When one is added, call `track("Lead", { content_category: "whatsapp" })` in its `onClick`.
- The Reemora Lounge account sign-up is not mapped to `CompleteRegistration`; that event means a completed **course** registration.

## Verify

**Meta Pixel Helper (Chrome extension)**
1. Open any public page: one `PageView`.
2. Click to another page: one more `PageView` (no duplicates).
3. Open a course page: `ViewContent` with the course id, price and `KWD`.
4. Submit the contact form or "Ask a question": `Lead`.
5. Submit the registration form: `InitiateCheckout`.
6. Open `/admin`: no pixel.

**Events Manager → Test Events (server events)**
1. Set `META_TEST_EVENT_CODE` on a Preview deployment (or locally) and redeploy.
2. Repeat steps 3–5: each event appears twice (Browser and Server) with the same Event ID and is marked **Deduplicated**.
3. Complete a registration: `CompleteRegistration` (Server).
4. Pay with a UPayments sandbox card: one `Purchase` (Server) with value, `KWD` and `order_id`. Refresh the success page: still one.
5. Remove `META_TEST_EVENT_CODE` before going live.

**Tests**: `npm test` covers normalisation/hashing, retry policy, the fbclid fallback, and Purchase firing exactly once (`src/lib/meta-capi.test.ts`, `src/lib/payment-reconciliation.meta.test.ts`).

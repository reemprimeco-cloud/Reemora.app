# API Reference

Reemora exposes its payment, form and admin-push API routes under `src/app/api/`. The payment routes run server-side using the **service-role** Supabase client (`createServiceRoleClient()`), which bypasses Row Level Security — this is intentional and is the only way `registrations`/`payments` rows get written, since those tables have no public insert policy (see [Database.md](./Database.md#row-level-security)).

There is no public REST API for reading course/instructor/testimonial data — public pages read directly from Supabase (or seed-data fallback) at render time via `src/lib/data/*`, not through these routes.

---

## `POST /api/payments/upayments`

Starts a registration and a UPayments hosted-checkout session. Called by `src/components/register-form.tsx` when a visitor submits the registration form.

### Request body

```jsonc
{
  "courseScheduleId": "uuid",          // required — the cohort being booked
  "fullName": "string",                // required, min 2 chars
  "email": "string",                   // required, validated
  "phone": "string",                   // required, 7–20 chars of digits/+/()/-/space
  "attendees": [{ "full_name": "", "email": "", "phone": "" }], // optional, one per extra seat (max 9)
  "notes": "string",                   // optional
  "paymentPlan": "full" | "installments", // optional, default "full"
  "lang": "en" | "ar"                  // optional, language for the hosted checkout page
}
```

Price, currency and course identity are derived **server-side** from the cohort id — nothing money-related is trusted from the client.

### Behavior

1. Validates the body, loads the cohort + course, checks `is_published`, `registration_open`, cohort status and seat availability.
2. Computes the total (`computeOrderTotal`: 5% off for 2+ seats).
3. Inserts a `registrations` row (`status: "pending"`, `payment_plan`).
4. Notifies the admin (Telegram + Web Push).
5. Inserts `payments` rows:
   - **Pay in full** → one row (`installment_no 1 / 1`).
   - **2 installments** → two rows: 50% now (`installment_no 1 / 2`) and 50% with a provisional `due_date` 30 days out (`installment_no 2 / 2`). The second row's `due_date` is re-anchored to the first payment's `paid_at` + 30 days once it clears. Rounding remainder lands on the second installment so the two always sum to the total.
6. If `website_settings.payment_mode = "whatsapp_manual"`, returns `{ whatsappManual: true, registrationId }` and skips the gateway.
7. Otherwise calls UPayments `POST /charge` for installment 1 (via `createCheckoutLink` in `src/lib/payments/checkout.ts`), stores `gateway_order_id` / `gateway_track_id` / `gateway_link` on the payment row and logs a `payment_transactions` `created` event.

### Responses

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "invoiceUrl": "https://…upayments…", "registrationId": "uuid" }` | Redirect the browser to `invoiceUrl` |
| `200` | `{ "whatsappManual": true, "registrationId": "uuid" }` | Manual mode — show the thank-you page |
| `400` | `{ "error", "fieldErrors": { field: message } }` | Validation failed |
| `403` / `404` / `409` | `{ "error" }` | Registration locked / course not found / cohort closed or not enough seats |
| `500` | `{ "error" }` | Database write failed |
| `502` | `{ "error", "registrationId", "savedOnly": true }` | Registration saved but UPayments call failed — staff can follow up manually |

---

## `GET | POST /api/payments/callback`

UPayments sends the student back here (`GET`, via `returnUrl` / `cancelUrl`) and POSTs the same fields server-to-server (`notificationUrl`). Both go through the same verification.

### Parameters

| Param | Set by | Meaning |
|---|---|---|
| `paymentRowId` | us (embedded in the callback URL) | Our internal `payments.id` |
| `cancelled=1` | us (only on `cancelUrl`) | Student backed out |
| `result` | UPayments | `CAPTURED` / `SUCCESS` on success; `NOT CAPTURED`, `CANCELED`, `ERROR`, `FAILURE` otherwise |
| `track_id`, `payment_id`, `requested_order_id`, `tran_id`, `ref`, `auth`, `post_date`, `payment_type` | UPayments | Gateway identifiers (stored for audit) |

### Behavior

1. Logs the raw params to `payment_transactions` (`event_type: "callback"`).
2. If the payment is already `paid`, redirects to success without touching anything (idempotent — the return redirect and the webhook both hit this route).
3. Otherwise calls UPayments `GET /get-payment-status/{track_id}` — **the redirect params are never trusted on their own**. A `CAPTURED` result whose echoed order id or amount doesn't match the stored row is treated as a failure and logged.
4. **Paid** → `payments.status = paid`, `paid_at`, `registrations.amount_paid += amount` (RPC `add_registration_paid_amount`). On installment 1 (or a full payment): `registrations.status = confirmed`, `decrement_seats`, and the second installment's `due_date` is set to today + 30. Admin is notified (Telegram + push).
5. **Failed** → installment 1: `payments.status = failed`, `registrations.status = cancelled`. Installment 2: stays `pending` so the student can retry from their pay link.
6. **Unverifiable** (gateway unreachable / unknown response) → nothing changes; a Telegram alert asks the admin to verify by hand; the student sees a "still confirming" banner.

Redirects: installment 1 → `/register/{slug}?status=success|failed|pending&ref=…` (`&plan=installments&due=YYYY-MM-DD` on the installment plan); installment 2 → `/pay/{paymentId}?status=…`. The `POST` variant returns `{ ok, outcome }` JSON.

---

## `POST /api/payments/pay/[paymentId]`

"Pay now" for an outstanding installment. The public page `/pay/[paymentId]` (the link sent in reminders) posts a plain HTML form here; the route mints a fresh UPayments checkout link for that payment row and `303`-redirects to it. Already-paid rows redirect back with `?status=success`; cancelled/refunded registrations with `?status=closed`.

---

## `GET | POST /api/payments/installments/remind`

Second-installment reminders by SMS/WhatsApp (Twilio, see `src/lib/sms.ts`).

- **`GET`** — run daily by the Vercel cron declared in `vercel.json` (`0 6 * * *` UTC = 09:00 Kuwait). Requires `Authorization: Bearer $CRON_SECRET` (Vercel adds it automatically). Selects pending second installments whose `due_date` is within 3 days or past, with fewer than 5 reminders sent and none in the last 3 days, whose registration is `confirmed`. Sends each one a bilingual message with their `/pay/{id}` link, logs a `payment_transactions` `reminder` event, bumps `reminder_count` / `last_reminder_at`, and posts a summary to Telegram. If Twilio isn't configured it only Telegrams the list so the admin can chase by hand.
- **`POST`** `{ "paymentId" }` — an admin (cookie session + `is_admin()`) sending one reminder now from the Registrations page. Ignores the schedule but still honours the 5-reminder cap.

---

## `POST /api/contact`

Public contact form submission. Called by `src/components/contact-form.tsx`.

### Request body

```jsonc
{
  "name": "string",     // required, min 2 chars after trim+truncate to 200 chars
  "email": "string",    // required, validated against /^[^\s@]+@[^\s@]+\.[^\s@]+$/, max 254 chars
  "phone": "string",    // optional, max 30 chars
  "subject": "string",  // optional, max 200 chars
  "message": "string"   // required, min 5 chars after trim, max 5000 chars
}
```

All fields pass through a `clean(value, maxLength)` helper that type-checks, trims, and truncates before validation — this bounds every field even if a caller bypasses the client-side form.

### Responses

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "ok": true }` | Message inserted into `contact_messages` |
| `400` | `{ "error": "Please fix the highlighted fields.", "fieldErrors": { "name": "...", ... } }` | Validation failed |
| `503` | `{ "error": "The contact form isn't connected yet..." }` | Supabase isn't configured (`isSupabaseConfigured === false`) |
| `500` | `{ "error": "Could not send your message..." }` | Database write failed |

---

## Error handling conventions

- Every route validates input shape defensively (`typeof` checks on the parsed JSON body) before touching the database — a malformed or missing body never reaches Supabase.
- Field-level errors are always returned as `fieldErrors: Record<string, string>` alongside a generic top-level `error` string, so the frontend can highlight the specific invalid field while still having a fallback message to display.
- Unexpected failures are logged via `console.error` (visible in Vercel → Deployments → Logs) and returned as a generic, non-leaking error message to the client — internal error details (stack traces, database error codes) are never sent to the browser.

# API Reference

Reemora exposes three Next.js API routes under `src/app/api/`. All three run server-side using the **service-role** Supabase client (`createServiceRoleClient()`), which bypasses Row Level Security — this is intentional and is the only way `registrations`/`payments` rows get written, since those tables have no public insert policy (see [Database.md](./Database.md#row-level-security)).

There is no public REST API for reading course/instructor/testimonial data — public pages read directly from Supabase (or seed-data fallback) at render time via `src/lib/data/*`, not through these routes.

---

## `POST /api/payments/myfatoorah`

Starts a registration and a MyFatoorah hosted-payment session. Called by `src/components/register-form.tsx` when a visitor submits the registration form.

### Request body

```jsonc
{
  "courseScheduleId": "uuid",   // required — the cohort being registered for
  "fullName": "string",         // required, min 2 chars (trimmed)
  "email": "string",            // required, validated against /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  "phone": "string",            // required, validated against /^[0-9+\s()-]{7,20}$/
  "seats": 1,                   // required, integer, 1–10
  "notes": "string"             // optional, free text
}
```

`fullName`, `email`, `phone`, and `notes` are trimmed server-side; `seats` is truncated to an integer. **Price, currency, course title, and slug are never read from the request body** — they're looked up server-side from `course_schedule` joined with `courses` using only `courseScheduleId`, so a tampered client request cannot register someone at an arbitrary price.

### Validation order

1. Field-level validation (shape/format) — see rules above.
2. Cohort lookup — 404 if `courseScheduleId` doesn't resolve to a real, published course.
3. Cohort status check — 409 if the cohort's `status` is `cancelled` or `completed`.
4. Seat availability check — 409 if `seats` exceeds `seats_available`.
5. Insert `registrations` row (`status: "pending"`), then `payments` row (`status: "pending"`), then call the MyFatoorah `SendPayment` API.

### Responses

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "invoiceUrl": "...", "registrationId": "uuid" }` | Success — client should redirect the browser to `invoiceUrl` |
| `400` | `{ "error": "Please fix the highlighted fields.", "fieldErrors": { "email": "..." } }` | Field validation failed |
| `404` | `{ "error": "This course cohort could not be found." }` or `"...not currently available..."` | Unknown/unpublished cohort |
| `409` | `{ "error": "This cohort is no longer open for registration." }` or a seats-left message | Cohort closed or full |
| `500` | `{ "error": "Could not save your registration..." }` or `"...start payment..."` | Database write failed |
| `502` | `{ "error": "...couldn't reach the payment gateway...", "registrationId": "uuid", "savedOnly": true }` | Registration was saved but MyFatoorah call failed — the row exists so staff can follow up manually |

Every outcome (including errors) is logged to `payment_transactions` when a `payments` row already exists, so there's a durable audit trail even for failures.

---

## `GET /api/payments/callback`

MyFatoorah redirects the browser here after the customer completes (or abandons) the hosted payment page. Not called directly by the frontend — the URL is generated server-side in the `myfatoorah` route above and passed to MyFatoorah as the `callbackUrl`.

### Query parameters (set by MyFatoorah / by us when constructing the callback URL)

| Param | Set by | Meaning |
|---|---|---|
| `paymentId` | MyFatoorah | MyFatoorah's own payment identifier, used to query status |
| `paymentRowId` | us (embedded in the callback URL) | Our internal `payments.id` |
| `courseSlug` | us (embedded in the callback URL) | Used to build the redirect back to the registration page |

### Behavior

1. Calls `GetPaymentStatus(paymentId)` against MyFatoorah.
2. Loads the matching `payments` row (joined with its `registrations` row).
3. **Verifies the amount**: a payment is only treated as paid if `InvoiceStatus === "Paid"` **and** the invoice value matches the stored `payments.amount` within 1 cent. A status of "Paid" with a mismatched amount is logged as an error and treated as a failed payment — this guards against a stale or mismatched `paymentId` being replayed against a different invoice.
4. Updates `payments.status` (`"paid"` or `"failed"`) and `payments.paid_at`.
5. Logs the raw MyFatoorah response to `payment_transactions` (`event_type: "callback"`).
6. Updates the linked `registrations.status` (`"confirmed"` or `"cancelled"`).
7. On success, calls the `decrement_seats` RPC to atomically reduce `course_schedule.seats_available`.
8. Redirects the browser to `/register/{courseSlug}?status=success|failed&ref={registrationId}`, which `register-form.tsx` reads to show a success/failure banner.

There is no JSON response — this route always issues a redirect (`307`), including on internal errors (redirects to `?status=failed` rather than showing a raw error page).

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
- Unexpected failures are logged via `console.error` (visible in Netlify function logs) and returned as a generic, non-leaking error message to the client — internal error details (stack traces, database error codes) are never sent to the browser.

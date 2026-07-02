# Database

Reemora uses Supabase Postgres. The schema lives in `supabase/migrations/` (source of truth, applied in order) and is also concatenated into `supabase/schema.sql` for a one-shot paste into the Supabase SQL Editor.

| File | Purpose |
|---|---|
| `0001_extensions_and_helpers.sql` | `pgcrypto` extension, shared `set_updated_at()` trigger function |
| `0002_tables.sql` | All 13 tables, indexes, triggers, `handle_new_user()` trigger, `decrement_seats()` RPC |
| `0003_rls.sql` | `is_admin()` helper, Row Level Security policies for every table, storage buckets |
| `0004_seed.sql` | Starter categories, one instructor with 3 certificates, 4 courses with schedules, 3 testimonials, default settings |

> `is_admin()` is defined in `0003`, not `0001`, because Postgres validates `language sql` function bodies against the catalog at `CREATE` time — it must be created after `public.users` exists.

## Entity-relationship overview

```
auth.users (Supabase-managed)
    │ 1:1 (trigger-populated)
    ▼
public.users ──────────────┐
    │ 1:N (optional)        │ role check ('admin' | 'student')
    ▼                       │
instructors ──┬─ 1:N ──▶ certificates
    │         │
    │         └─ 1:N ──▶ courses ──1:N──▶ course_schedule ──1:N──▶ registrations ──1:N──▶ payments ──1:N──▶ payment_transactions
    │                       ▲
course_categories ──1:N────┘

testimonials · website_settings · portfolio · contact_messages   (standalone tables)
```

## Tables

### `users`
Extends `auth.users`. Auto-populated by the `on_auth_user_created` trigger (`handle_new_user()`) whenever someone signs up via Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | references `auth.users(id)` |
| `email` | text not null | |
| `full_name` | text | |
| `avatar_url` | text | |
| `phone` | text | |
| `role` | text not null default `'student'` | check: `'admin' \| 'student'` |
| `created_at` / `updated_at` | timestamptz | `updated_at` auto-maintained by trigger |

To promote a user to admin: `update public.users set role = 'admin' where email = '...';`

### `instructors`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `users` | nullable, `on delete set null` |
| `full_name` | text not null | |
| `title`, `bio`, `photo_url` | text | |
| `years_experience` | integer | |
| `is_lead` | boolean not null default false | |
| `social_links` | jsonb not null default `{}` | |
| `display_order` | integer not null default 0 | |

### `certificates`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `instructor_id` | uuid FK → `instructors`, not null | `on delete cascade` |
| `title` | text not null | |
| `issuing_body`, `image_url`, `credential_url` | text | |
| `issue_date` | date | |
| `display_order` | integer not null default 0 | |

### `course_categories`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null unique | |
| `slug` | text not null unique | |
| `description` | text | |
| `display_order` | integer not null default 0 | |

### `courses`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text not null unique | |
| `title` | text not null | |
| `category_id` | uuid FK → `course_categories` | nullable, `on delete set null` |
| `instructor_id` | uuid FK → `instructors` | nullable, `on delete set null` |
| `level` | text not null | check: `'Beginner' \| 'Intermediate' \| 'Advanced'` |
| `duration_weeks` | integer not null | check `> 0` |
| `price` | numeric(10,2) not null | check `>= 0` |
| `currency` | text not null default `'KWD'` | |
| `image_url` | text | nullable — see [Architecture.md](./Architecture.md) `courseImageSrc()` fallback |
| `short_description`, `description` | text not null | |
| `curriculum` | text[] not null default `{}` | one item per line in the admin editor |
| `is_published` | boolean not null default true | gates public visibility |

Indexed on `category_id`, `instructor_id`, `is_published`.

### `course_schedule`
A course can run multiple times; each cohort is its own row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK → `courses`, not null | `on delete cascade` |
| `start_date`, `end_date` | date | |
| `session_days`, `session_time` | text | free-text, e.g. `"Sun, Tue"` / `"6:00 PM - 9:00 PM"` |
| `seats_total` | integer not null default 20 | check `> 0` |
| `seats_available` | integer not null default 20 | check `>= 0`, and `<= seats_total` (table constraint) |
| `status` | text not null default `'upcoming'` | check: `'upcoming' \| 'ongoing' \| 'completed' \| 'cancelled'` |

Indexed on `course_id`, `status`, `start_date`.

### `registrations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_schedule_id` | uuid FK → `course_schedule`, not null | `on delete cascade` |
| `user_id` | uuid FK → `users` | nullable, `on delete set null` |
| `full_name`, `email`, `phone` | text not null | |
| `seats` | integer not null default 1 | check `> 0` |
| `notes` | text | |
| `amount` | numeric(10,2) not null | check `>= 0` — always server-derived, never client-supplied |
| `currency` | text not null default `'KWD'` | |
| `status` | text not null default `'pending'` | check: `'pending' \| 'confirmed' \| 'cancelled'` |

### `payments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `registration_id` | uuid FK → `registrations`, not null | `on delete cascade` |
| `amount`, `currency` | numeric / text | mirrors the registration at creation time |
| `status` | text not null default `'pending'` | check: `'pending' \| 'paid' \| 'failed' \| 'refunded' \| 'cancelled'` |
| `method` | text not null default `'myfatoorah'` | |
| `myfatoorah_invoice_id`, `myfatoorah_payment_id` | text | |
| `paid_at` | timestamptz | set when confirmed |

### `payment_transactions`
Audit log of every interaction with the MyFatoorah API for a given payment.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `payment_id` | uuid FK → `payments`, not null | `on delete cascade` |
| `event_type` | text not null | check: `'created' \| 'callback' \| 'webhook' \| 'status_check' \| 'error'` |
| `status` | text | |
| `raw_response` | jsonb | full gateway response, for debugging/reconciliation |

### `testimonials`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `student_name`, `quote` | text not null | |
| `role_company`, `avatar_url` | text | |
| `rating` | integer | check `between 1 and 5` |
| `is_published` | boolean not null default true | |
| `display_order` | integer not null default 0 | |

### `website_settings`
Simple key/value store for global site config (contact info, social links, CV URL, etc.), edited via `/admin/settings`.

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | e.g. `site_name`, `contact_email`, `social_links` |
| `value` | jsonb not null | |
| `updated_at` | timestamptz | auto-maintained |

### `portfolio`
Reserved for a future portfolio/case-studies section; not currently surfaced in the UI.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text not null | |
| `description`, `image_url`, `project_url`, `category` | text | |
| `is_published` | boolean not null default true | |
| `display_order` | integer not null default 0 | |

### `contact_messages`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name`, `email` | text not null | |
| `phone`, `subject` | text | |
| `message` | text not null | |
| `is_read` | boolean | toggled from `/admin/messages` |
| `created_at` | timestamptz | |

## Functions & triggers

| Name | Type | Purpose |
|---|---|---|
| `set_updated_at()` | trigger function | Stamps `updated_at = now()` on update; attached to `users`, `instructors`, `courses`, `course_schedule`, `payments`, `website_settings` |
| `handle_new_user()` | trigger function, `security definer` | Inserts a `public.users` row whenever a new `auth.users` row is created (on sign-up) |
| `decrement_seats(p_schedule_id, p_seats)` | RPC, `security definer` | Atomically reduces `course_schedule.seats_available` (floored at 0); called from the payment callback route once a payment is confirmed |
| `is_admin()` | RPC, `security definer`, `stable` | Returns whether `auth.uid()` corresponds to a `public.users` row with `role = 'admin'`; used throughout RLS policies |

## Row Level Security

Every table has RLS enabled. The general pattern:

- **Public content** (`instructors`, `certificates`, `course_categories`, `course_schedule`, `website_settings`): public `select`; writes require `is_admin()`.
- **Courses / testimonials / portfolio**: public `select` filtered to `is_published = true`; admins can additionally select unpublished rows and manage all rows.
- **`users`**: a user can select/update only their own row (`id = auth.uid()`), or any row if they're an admin.
- **`registrations` / `payments` / `payment_transactions`**: **no public insert or open select policy at all.** These are written exclusively by API routes using the service-role client, which bypasses RLS entirely — this is intentional and is what prevents a client from forging or tampering with a registration's price (see [API.md](./API.md)). Authenticated users can view their own registrations; only admins can view payments and transactions.
- **`contact_messages`**: anyone can `insert` (the public contact form); only admins can `select`/`update` (mark as read).

## Storage buckets

| Bucket | Public read | Admin write |
|---|---|---|
| `course-images` | ✅ | ✅ (via `is_admin()`) |
| `site-assets` | ✅ | ✅ (via `is_admin()`) |

Both buckets are created by `0003_rls.sql` with matching `storage.objects` policies.

## Regenerating types after a schema change

`src/lib/supabase/database.types.ts` is currently hand-authored (written to satisfy the `GenericTable` shape required by `@supabase/postgrest-js`, including per-table `Relationships` arrays). After any schema change, regenerate it from the live project instead of hand-editing:

```bash
supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
```

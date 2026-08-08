-- Reemora — Web Push subscriptions for the admin panel. Each row is one
-- browser/device the admin enabled notifications on (they can have
-- several — phone, laptop, etc). Only the logged-in admin can create,
-- view, or delete their own subscriptions; sending itself is done
-- server-side with the service role, which bypasses RLS.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Admins can manage their own push subscriptions" on public.push_subscriptions;

create policy "Admins can manage their own push subscriptions" on public.push_subscriptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

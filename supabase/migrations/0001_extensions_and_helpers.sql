-- Reemora training platform — extensions & shared helper functions
-- Applied first; later migrations depend on these.

create extension if not exists "pgcrypto";

-- Generic updated_at maintenance, reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Note: is_admin() is defined in 0003_rls.sql, not here — it's a `language
-- sql` function, and SQL-language functions are validated against the
-- catalog at CREATE time, so it must come after public.users exists.

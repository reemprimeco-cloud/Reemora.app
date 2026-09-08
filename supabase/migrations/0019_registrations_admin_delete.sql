-- Reemora — let admins delete a registration from the admin table (e.g.
-- test entries, cancelled rows). No delete policy previously existed on
-- registrations, so the admin UI's delete button would have silently
-- no-op'd under RLS. payments/payment_transactions cascade automatically
-- (see 0002_tables.sql's "on delete cascade" foreign keys).
drop policy if exists "Admins can delete registrations" on public.registrations;
create policy "Admins can delete registrations" on public.registrations
  for delete to authenticated using (public.is_admin());

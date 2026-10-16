-- Reemora Lounge — verified badge.
--
-- is_verified marks official / certified members (the Reemora team, a
-- certified trainer) with a check badge next to their name everywhere in
-- the Lounge. badge_label is the text behind it ("Reemora Team",
-- "Certified Trainer"). Both are outside the member column grant from
-- 0026, so only admins (service role) can set them.

alter table public.lounge_members
  add column if not exists is_verified boolean not null default false,
  add column if not exists badge_label text check (badge_label is null or char_length(badge_label) <= 40);

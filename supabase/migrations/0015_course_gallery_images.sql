-- Reemora — extra preview images for the course detail page, shown as a
-- thumbnail strip under the main hero image so a visitor can click through
-- more shots of the course/product/classroom before registering.

alter table public.courses
  add column if not exists gallery_images text[] not null default '{}'::text[];

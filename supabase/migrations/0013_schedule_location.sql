-- Reemora — per-cohort location (e.g. "Online — Zoom", "Reemora HQ,
-- Kuwait City"). Shown on the course detail sidebar under Time.

alter table public.course_schedule
  add column if not exists location text;

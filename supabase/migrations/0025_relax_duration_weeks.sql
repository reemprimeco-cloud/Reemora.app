-- Reemora — unblock course creation.
--
-- courses.duration_weeks carries CHECK (duration_weeks > 0) from the
-- original schema, when a course's length was expressed in weeks. Duration
-- is now entered as days + hours (duration_days / duration_hours), which is
-- what the course card and detail page actually render; nothing in the app
-- reads duration_weeks any more.
--
-- The admin course editor therefore sends 0 for it on every new course,
-- which the constraint rejects — so creating a course failed outright with
-- "violates check constraint courses_duration_weeks_check".
--
-- Drop the constraint and give the column a default so inserts don't have
-- to mention it at all. The column itself is left in place (with its
-- existing values) rather than dropped, since removing it is irreversible
-- and it costs nothing to keep.

alter table public.courses drop constraint if exists courses_duration_weeks_check;

alter table public.courses alter column duration_weeks set default 0;

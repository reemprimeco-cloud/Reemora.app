-- Reemora — generic seat adjustment, used when an admin manually flips a
-- WhatsApp-manual registration's status to/from "confirmed" (there's no
-- MyFatoorah webhook to decrement seats for that payment method, unlike
-- the automated card-payment flow). Delta can be negative (reserve a
-- seat) or positive (release one back), always clamped to
-- [0, seats_total] so it can never go negative or exceed capacity.
create or replace function public.adjust_seats_available(p_schedule_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.course_schedule
  set seats_available = least(seats_total, greatest(0, seats_available + p_delta))
  where id = p_schedule_id;
end;
$$;

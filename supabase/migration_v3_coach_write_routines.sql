-- Migration v3: let the coach create/edit/delete routines and assignments from the app.
-- Until now the coach could only READ routines (SELECT). This adds write access so the
-- routine builder in the admin panel works without touching Supabase directly.
-- Run this once in the Supabase SQL editor.

-- ─── fit_routines: coach full write access ───────────────────────────────────
create policy "coach inserts routines" on fit_routines
  for insert with check ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach updates routines" on fit_routines
  for update using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach deletes routines" on fit_routines
  for delete using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

-- ─── fit_routine_assignments: coach full write access ────────────────────────
create policy "coach inserts assignments" on fit_routine_assignments
  for insert with check ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach updates assignments" on fit_routine_assignments
  for update using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach deletes assignments" on fit_routine_assignments
  for delete using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

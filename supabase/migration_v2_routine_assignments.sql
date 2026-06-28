-- Migration v2: split "routine" from "who it's assigned to"
-- so one routine can be shared by several clients (e.g. the 2 or 3 you train together)
-- and editing it once updates it for everyone assigned.
-- Run this once in the SQL Editor of your existing project.

create table fit_routine_assignments (
  routine_id uuid not null references fit_routines(id) on delete cascade,
  client_id uuid not null references fit_clients(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (routine_id, client_id)
);

-- carry over existing 1-client-per-routine rows into the new assignment table
insert into fit_routine_assignments (routine_id, client_id)
select id, client_id from fit_routines where client_id is not null;

-- drop the old policy first: it depends on the client_id column we're about to remove
drop policy "clients read own routines" on fit_routines;

alter table fit_routines drop column client_id;

alter table fit_routine_assignments enable row level security;

create policy "clients read own assignments" on fit_routine_assignments
  for select using (auth.uid() = client_id);

create policy "coach reads all assignments" on fit_routine_assignments
  for select using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "clients read assigned routines" on fit_routines
  for select using (
    exists (
      select 1 from fit_routine_assignments a
      where a.routine_id = fit_routines.id and a.client_id = auth.uid()
    )
  );

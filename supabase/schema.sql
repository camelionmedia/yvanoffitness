-- Yvanoff Fitness / fittrack schema (v2: routines can be shared by multiple clients)
-- Run this in the SQL editor for a brand new Supabase project.
-- If you already ran the v1 version of this file, use migration_v2_routine_assignments.sql instead.

create table fit_clients (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table fit_routines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- shape: { "Lunes": [ { "id": "e1", "name": "Sentadilla", "sets": 4, "reps": "8-10", "rest": 90, "notes": "", "video": "https://youtube.com/..." } ], "Martes": [...] }
  days jsonb not null default '{}',
  created_at timestamptz default now()
);

-- A routine can be assigned to more than one client (e.g. two or three people who train together
-- on the same plan). Edit the routine once and everyone assigned to it sees the update.
create table fit_routine_assignments (
  routine_id uuid not null references fit_routines(id) on delete cascade,
  client_id uuid not null references fit_clients(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (routine_id, client_id)
);

create table fit_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references fit_clients(id) on delete cascade,
  date date not null,
  completed boolean default false,
  duration int,
  exercises jsonb default '{}',
  created_at timestamptz default now(),
  unique (client_id, date)
);

alter table fit_clients enable row level security;
alter table fit_routines enable row level security;
alter table fit_routine_assignments enable row level security;
alter table fit_logs enable row level security;

create policy "clients read own row" on fit_clients
  for select using (auth.uid() = id);

create policy "clients read assigned routines" on fit_routines
  for select using (
    exists (
      select 1 from fit_routine_assignments a
      where a.routine_id = fit_routines.id and a.client_id = auth.uid()
    )
  );

create policy "clients read own assignments" on fit_routine_assignments
  for select using (auth.uid() = client_id);

create policy "clients read own logs" on fit_logs
  for select using (auth.uid() = client_id);

create policy "clients insert own logs" on fit_logs
  for insert with check (auth.uid() = client_id);

create policy "clients update own logs" on fit_logs
  for update using (auth.uid() = client_id);

-- Coach/admin read access: lets the coach's own login see every client's data.
-- Update the email below if you ever change which account is the coach login.
create policy "coach reads all clients" on fit_clients
  for select using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach reads all routines" on fit_routines
  for select using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach reads all assignments" on fit_routine_assignments
  for select using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

create policy "coach reads all logs" on fit_logs
  for select using ((auth.jwt() ->> 'email') = 'adrianyvanoff14@hotmail.com');

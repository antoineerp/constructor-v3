-- Supabase schema pour Constructor V3 (version clé primaire integer)
-- Exécuter dans SQL Editor ou via CLI. Idempotent via IF EXISTS / IF NOT EXISTS.
-- Si une migration future vers UUID est souhaitée, voir commentaire en bas.

-- Extension recommandées (certaines déjà activées par défaut)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  original_query text,
  blueprint_json jsonb,
  code_generated jsonb,
  status text default 'draft',
  last_auto_refine_score int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_files (
  id bigserial primary key,
  project_id integer not null references public.projects(id) on delete cascade,
  filename text not null,
  content text,
  stage text default 'final',
  pass_index int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, filename)
);

-- Indexation
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_project_files_project on public.project_files(project_id);
create index if not exists idx_project_files_filename on public.project_files(filename);

-- Trigger updated_at auto (helper function)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach triggers
create trigger trg_projects_updated
before update on public.projects
for each row execute procedure public.set_updated_at();

create trigger trg_project_files_updated
before update on public.project_files
for each row execute procedure public.set_updated_at();

-- Activer RLS
alter table public.projects enable row level security;
alter table public.project_files enable row level security;

-- NOTE: Postgres ne supporte pas CREATE POLICY IF NOT EXISTS.
-- Pour rendre idempotent, on supprime puis on recrée.
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using ( auth.uid() = user_id );

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check ( auth.uid() = user_id );

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using ( auth.uid() = user_id );

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using ( auth.uid() = user_id );

drop policy if exists "project_files_select" on public.project_files;
create policy "project_files_select" on public.project_files
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id
      and p.user_id = auth.uid()
    )
  );

drop policy if exists "project_files_mutation" on public.project_files;
create policy "project_files_mutation" on public.project_files
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id
      and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id
      and p.user_id = auth.uid()
    )
  );

-- Table usage_stats (agrégat simple global)
create table if not exists public.usage_stats (
  date date primary key default current_date,
  total_projects int default 0,
  total_prompts int default 0,
  created_at timestamptz default now()
);
alter table public.usage_stats enable row level security;
drop policy if exists usage_stats_read on public.usage_stats;
create policy usage_stats_read on public.usage_stats for select using (true);

-- Recommandation future: table user_settings si besoin de stocker préférences.
-- Example (commenté):
-- create table if not exists public.user_settings (
--   user_id uuid primary key references auth.users(id) on delete cascade,
--   preferred_provider text,
--   generation_profile text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
-- alter table public.user_settings enable row level security;
-- create policy if not exists "user_settings_rw" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FUTURE MIGRATION VERS UUID (résumé):
-- 1) alter table public.projects add column id_uuid uuid default gen_random_uuid();
-- 2) update public.projects set id_uuid = gen_random_uuid() where id_uuid is null;
-- 3) alter table public.projects alter column id_uuid set not null;
-- 4) drop constraint projects_pkey; add constraint projects_pkey primary key(id_uuid);
-- 5) alter table public.projects rename column id to id_old_int; rename column id_uuid to id;
-- 6) ajuster les FKs des tables dépendantes (project_files.project_id etc.).

-- FIN schema

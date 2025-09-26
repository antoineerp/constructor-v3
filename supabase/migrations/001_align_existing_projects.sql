-- Migration: align existing 'projects' table (integer PK) with application expectations.
-- This script is idempotent and safe to re-run.
-- It keeps your current integer primary key and adapts dependent objects.

-- 1. Ensure helper function for updated_at exists
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. Add missing columns if they are expected by the app code
alter table public.projects
  add column if not exists original_query text,
  add column if not exists blueprint_json jsonb,
  add column if not exists last_auto_refine_score int;

-- 3. Backward compatibility: if older column name 'prompt_original' exists and 'original_query' is null, copy data
update public.projects
set original_query = coalesce(original_query, prompt_original)
where prompt_original is not null; -- safe even if prompt_original absent (silently ignored by planner if column missing)

-- 4. Ensure code_generated column exists (already present in your snapshot, but idempotent)
alter table public.projects
  add column if not exists code_generated jsonb;

-- 5. Ensure status column exists with default
alter table public.projects
  add column if not exists status text default 'draft';

-- 6. Ensure timestamps
alter table public.projects
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- 7. Attach / re-attach trigger for updated_at
-- Drop old trigger if name differs
drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated
before update on public.projects
for each row execute procedure public.set_updated_at();

-- 8. Create project_files table (integer FK) if not exists
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

-- 9. indexation project_files
create index if not exists idx_project_files_project on public.project_files(project_id);
create index if not exists idx_project_files_filename on public.project_files(filename);

-- 10. Trigger for project_files updated_at
drop trigger if exists trg_project_files_updated on public.project_files;
create trigger trg_project_files_updated
before update on public.project_files
for each row execute procedure public.set_updated_at();

-- 11. Enable RLS (if not already)
alter table public.project_files enable row level security;
alter table public.projects enable row level security;

-- 12. Policies (integer version)
-- Drop then recreate to keep idempotent
-- projects
drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects for select using (auth.uid() = user_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects for insert with check (auth.uid() = user_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects for update using (auth.uid() = user_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects for delete using (auth.uid() = user_id);

-- project_files (join via integer project_id)
drop policy if exists project_files_select on public.project_files;
create policy project_files_select on public.project_files
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_files.project_id
      and p.user_id = auth.uid()
    )
  );

drop policy if exists project_files_mutation on public.project_files;
create policy project_files_mutation on public.project_files
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

-- 13. Optional usage_stats table (aggregate global)
create table if not exists public.usage_stats (
  date date primary key default current_date,
  total_projects int default 0,
  total_prompts int default 0,
  created_at timestamptz default now()
);
alter table public.usage_stats enable row level security;

drop policy if exists usage_stats_read on public.usage_stats;
create policy usage_stats_read on public.usage_stats for select using (true);

-- 14. Comment: If you later migrate to UUID, create new column, copy, swap PK, then adjust FKs.

-- END MIGRATION

-- Ajout colonne owner_id si absente
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Propager owner_id sur project_files (trigger possible, ici simple update)
UPDATE project_files pf SET owner_id = p.owner_id FROM projects p WHERE pf.project_id = p.id AND pf.owner_id IS NULL;

-- Activer RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Policies projects
CREATE POLICY projects_select ON projects FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY projects_update ON projects FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Policies project_files
CREATE POLICY project_files_select ON project_files FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY project_files_insert ON project_files FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY project_files_update ON project_files FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Table logs génération / réparation
CREATE TABLE IF NOT EXISTS generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  project_id uuid,
  type text NOT NULL, -- generation|auto-repair
  filename text,
  pass_count int,
  duration_ms int,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS generation_logs_user_idx ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS generation_logs_project_idx ON generation_logs(project_id);

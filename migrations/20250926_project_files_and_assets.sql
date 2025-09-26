-- Migration: project_files + assets_json + blueprint_json + original_query alignment
-- Date: 2025-09-26
-- À exécuter dans Supabase (SQL Editor) avant déploiement des nouvelles fonctionnalités.

-- Ajouter colonnes manquantes sur projects (si elles n'existent pas déjà)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_query TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blueprint_json JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assets_json JSONB; -- mapping d'assets générés (images, etc.)

-- Créer table project_files pour stocker chaque fichier généré individuellement
CREATE TABLE IF NOT EXISTS project_files (
  id BIGSERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  stage TEXT DEFAULT 'final',              -- scaffold | fill | optimize | final
  pass_index INT DEFAULT 0,                -- numéro de passe multi-pass
  last_regenerated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, filename)
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_filename ON project_files(filename);

-- RLS
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Sélection fichiers utilisateur" ON project_files
  FOR SELECT USING ( auth.uid() = (SELECT user_id FROM projects p WHERE p.id = project_files.project_id) );

CREATE POLICY IF NOT EXISTS "Insertion fichiers utilisateur" ON project_files
  FOR INSERT WITH CHECK ( auth.uid() = (SELECT user_id FROM projects p WHERE p.id = project_files.project_id) );

CREATE POLICY IF NOT EXISTS "Mise à jour fichiers utilisateur" ON project_files
  FOR UPDATE USING ( auth.uid() = (SELECT user_id FROM projects p WHERE p.id = project_files.project_id) );

CREATE POLICY IF NOT EXISTS "Suppression fichiers utilisateur" ON project_files
  FOR DELETE USING ( auth.uid() = (SELECT user_id FROM projects p WHERE p.id = project_files.project_id) );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_files_updated_at ON project_files;
CREATE TRIGGER trg_project_files_updated_at BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Exécuter un backfill si nécessaire pour recopier le JSON code_generated existant dans project_files
-- Exemple (à lancer manuellement si souhaité):
-- DO $$
-- DECLARE r RECORD; k TEXT; v TEXT; BEGIN
--   FOR r IN SELECT id, code_generated FROM projects LOOP
--     IF r.code_generated IS NOT NULL THEN
--       FOR k,v IN SELECT key, value::text FROM json_each_text(r.code_generated) LOOP
--         INSERT INTO project_files(project_id, filename, content, stage, pass_index)
--         VALUES (r.id, k, v, 'legacy-import', 0)
--         ON CONFLICT (project_id, filename) DO NOTHING;
--       END LOOP;
--     END IF;
--   END LOOP;
-- END $$;

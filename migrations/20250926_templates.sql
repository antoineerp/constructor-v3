-- Migration: templates (catalogue de templates réutilisables)
-- Date: 2025-09-26

CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED,
  description TEXT,
  blueprint_json JSONB,
  components_snapshot JSONB,      -- snapshot optionnel du catalogue de composants au moment de la création
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates select" ON templates FOR SELECT USING (true); -- lecture publique (ajuster si besoin)
CREATE POLICY "Templates insert" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Templates update" ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Templates delete" ON templates FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION trg_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS templates_updated_at ON templates;
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION trg_templates_updated_at();

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);

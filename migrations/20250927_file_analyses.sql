-- Migration: file_analyses (cache analyses fichiers: image / pdf / texte)
-- Date: 2025-09-27

CREATE TABLE IF NOT EXISTS file_analyses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  hash TEXT NOT NULL,                 -- sha1 du contenu binaire ou texte normalisé
  mime TEXT,                          -- mime détecté
  bytes INT,                          -- taille
  kind TEXT,                          -- image | pdf | text | other
  analysis JSONB,                     -- résultat structuré (résumé, couleurs, tokens, etc.)
  raw_excerpt TEXT,                   -- extrait brut (texte OCR / plaintext tronqué)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hash)
);

ALTER TABLE file_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "file_analyses_select" ON file_analyses
  FOR SELECT USING ( auth.uid() = user_id OR user_id IS NULL );

CREATE POLICY "file_analyses_insert" ON file_analyses
  FOR INSERT WITH CHECK ( auth.uid() = user_id OR user_id IS NULL );

CREATE POLICY "file_analyses_update" ON file_analyses
  FOR UPDATE USING ( auth.uid() = user_id );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION trg_file_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_analyses_updated_at ON file_analyses;
CREATE TRIGGER file_analyses_updated_at BEFORE UPDATE ON file_analyses
  FOR EACH ROW EXECUTE FUNCTION trg_file_analyses_updated_at();

CREATE INDEX IF NOT EXISTS idx_file_analyses_hash ON file_analyses(hash);
CREATE INDEX IF NOT EXISTS idx_file_analyses_user ON file_analyses(user_id);

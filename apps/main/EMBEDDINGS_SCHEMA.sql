-- pgvector schema (à exécuter côté base Postgres quand prêt)
CREATE EXTENSION IF NOT EXISTS vector;

-- Adapter dimension selon le modèle choisi (ex: 1536 OpenAI, 384 e5-small)
CREATE TABLE IF NOT EXISTS code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  path TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  language TEXT NOT NULL,
  tokens INT,
  embedding vector(1536),
  content TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index vectoriel (créer après plusieurs centaines d'entrées)
-- CREATE INDEX code_snippets_embedding_ivfflat ON code_snippets USING ivfflat (embedding vector_cosine_ops) WITH (lists=64);

-- Requête similarité (cosine):
-- SELECT id, path, kind, 1 - (embedding <=> $1) AS score
-- FROM code_snippets
-- ORDER BY embedding <=> $1
-- LIMIT 10;

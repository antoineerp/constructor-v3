-- Constructor V3 - Initialisation Supabase
-- Copiez-collez ce script dans l'éditeur SQL de Supabase

-- Créer les tables principales
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  structure JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS components (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  props JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id UUID DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  prompt_original TEXT NOT NULL,
  template_id INTEGER REFERENCES templates(id),
  code_generated JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Données de test
INSERT INTO templates (name, type, description, structure) VALUES
('E-commerce', 'e-commerce', 'Site de vente en ligne', '{"routes": ["/", "/products"]}'),
('Blog', 'blog', 'Blog personnel', '{"routes": ["/", "/blog"]}'),
('Portfolio', 'portfolio', 'Portfolio créatif', '{"routes": ["/", "/portfolio"]}')
ON CONFLICT DO NOTHING;

INSERT INTO components (name, type, category, code) VALUES
('Button', 'button', 'ui', '<button><slot /></button>'),
('Card', 'card', 'ui', '<div class="card"><slot /></div>'),
('Header', 'header', 'navigation', '<header><slot /></header>')
ON CONFLICT DO NOTHING;
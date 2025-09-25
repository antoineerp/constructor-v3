-- Constructor V3 - Schéma de base de données Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'UTC';

-- Créer les tables principales

-- Templates de projets
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'e-commerce', 'crm', 'blog', 'portfolio', 'dashboard', 'landing-page'
  description TEXT,
  structure JSONB NOT NULL, -- Structure des routes/composants
  preview_image TEXT, -- URL de l'image de préview
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Composants réutilisables  
CREATE TABLE components (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'header', 'button', 'card', 'form', etc.
  category TEXT NOT NULL, -- 'ui', 'layout', 'form', 'navigation', etc.
  code TEXT NOT NULL, -- Code Svelte du composant
  props JSONB, -- Props du composant avec types
  dependencies JSONB, -- Dépendances npm requises
  preview_image TEXT, -- URL de l'image de préview
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prompts et associations
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_id INTEGER REFERENCES templates(id),
  components JSONB, -- IDs des composants utilisés
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projets utilisateurs
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- Utilisateur Supabase Auth
  name TEXT NOT NULL,
  description TEXT,
  prompt_original TEXT NOT NULL, -- Prompt initial de l'utilisateur
  template_id INTEGER REFERENCES templates(id),
  components_used JSONB, -- IDs des composants utilisés
  code_generated JSONB NOT NULL, -- Code généré par l'IA
  iterations JSONB, -- Historique des itérations/modifications
  status TEXT DEFAULT 'draft', -- 'draft', 'completed', 'published'
  preview_url TEXT, -- URL de preview du projet
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Statistiques d'utilisation (pour l'admin)
CREATE TABLE usage_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_prompts INTEGER DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  template_usage JSONB, -- Usage par template
  component_usage JSONB, -- Usage par composant
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_template_id ON projects(template_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_prompts_template_id ON prompts(template_id);
CREATE INDEX idx_components_category ON components(category);
CREATE INDEX idx_components_type ON components(type);
CREATE INDEX idx_usage_stats_date ON usage_stats(date);

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les projets (utilisateurs peuvent voir leurs propres projets)
CREATE POLICY "Utilisateurs peuvent voir leurs projets" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent créer leurs projets" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent modifier leurs projets" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs peuvent supprimer leurs projets" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour les templates et composants (lecture publique)
CREATE POLICY "Templates lisibles publiquement" ON templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Composants lisibles publiquement" ON components
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Prompts lisibles publiquement" ON prompts
  FOR SELECT TO authenticated USING (true);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour incrémenter les statistiques
CREATE OR REPLACE FUNCTION increment_usage_stats(
    template_id_param INTEGER DEFAULT NULL,
    component_id_param INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- Insérer ou mettre à jour les stats du jour
    INSERT INTO usage_stats (date, total_prompts, total_projects)
    VALUES (current_date_val, 1, 0)
    ON CONFLICT (date) DO UPDATE SET
        total_prompts = usage_stats.total_prompts + 1;
        
    -- TODO: Ajouter la logique pour template_usage et component_usage
END;
$$ LANGUAGE plpgsql;
# Constructor V3

Application de génération d'applications web SvelteKit basée sur l'IA.

## Architecture

### Applications (apps/)

- **main** - Application principale avec chat IA et éditeur Monaco
- **preview** - Environnement de preview isolé pour les applications générées  
- **admin** - Dashboard administrateur pour gérer templates et composants

### Packages partagés (packages/)

- **ui** - Composants Svelte réutilisables (ShadCN/Svelte style)
- **db** - Utilitaires et types Supabase
- **ai** - Logique LangChain/OpenAI pour génération de code
- **editor** - Monaco Editor + collaboration temps réel

## Stack Technique

### Frontend
- **SvelteKit 2.5+** - Framework principal
- **TailwindCSS** - Styling
- **Monaco Editor** - Éditeur de code
- **Socket.io** - Collaboration temps réel

### Backend
- **Supabase** - Base de données PostgreSQL + Auth
- **OpenAI GPT-4o-mini** - Génération de code IA
- **LangChain** - Orchestration IA

### Infrastructure
- **Vercel** - Déploiement frontend
- **pnpm** - Gestionnaire de paquets
- **TurboRepo** - Monorepo

## Installation

```bash
# Installer les dépendances
pnpm install

# Démarrer en mode développement
pnpm run dev

# Build pour production  
pnpm run build
```

## Développement

### Structure du projet

```
constructor-v3/
├── apps/
│   ├── main/           # App principale (port 5173)
│   ├── preview/        # Preview isolée (port 5174) 
│   └── admin/          # Dashboard admin (port 5176)
├── packages/
│   ├── ui/             # Composants partagés
│   ├── db/             # Utilitaires Supabase
│   ├── ai/             # Logique IA
│   └── editor/         # Monaco + collaboration
├── scripts/            # Scripts utilitaires
└── docs/               # Documentation
```

### Variables d'environnement

Créer un fichier `.env` avec :

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Socket.io (optionnel)
SOCKET_SERVER_URL=http://localhost:3001
```

### Base de données Supabase

Tables nécessaires :

```sql
-- Templates
CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  structure JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Composants
CREATE TABLE components (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  props JSONB,
  dependencies JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prompts
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_id INTEGER REFERENCES templates(id),
  components JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projets utilisateurs
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_original TEXT NOT NULL,
  template_id INTEGER REFERENCES templates(id),
  components_used JSONB,
  code_generated JSONB NOT NULL,
  iterations JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Fonctionnalités

### Chat IA Intelligent
- Analyse des prompts utilisateurs
- Sélection automatique de templates
- Génération de code SvelteKit
- Itérations basées sur le feedback

### Éditeur Monaco Intégré
- Syntaxe highlighting pour Svelte
- Autocomplétion intelligente
- Validation en temps réel
- Snippets SvelteKit

### Preview Temps Réel
- Hot reloading avec Vite
- Environnement isolé sécurisé
- Preview dans iframe

### Collaboration
- Curseurs partagés en temps réel
- Chat intégré
- Synchronisation des modifications

### Dashboard Admin
- Gestion des templates
- Analyse des prompts populaires
- Métriques d'utilisation
- Gestion des composants

## Workflow Utilisateur

1. **Description du projet** - L'utilisateur décrit son besoin
2. **Analyse IA** - L'IA analyse et propose des clarifications
3. **Génération** - Sélection de template et génération de code
4. **Preview** - Aperçu temps réel de l'application
5. **Itérations** - Modifications via feedback utilisateur
6. **Export/Déploiement** - Sauvegarde ou déploiement direct

## API Routes

### Main App (port 5173)
- `POST /api/generate` - Génération de code IA
- `POST /api/iterate` - Itération sur code existant
- `GET /api/templates` - Liste des templates
- `GET /api/components` - Liste des composants

### Preview App (port 5174)
- `POST /api/update` - Mise à jour du code de preview
- `GET /api/status` - Status de la preview

### Admin App (port 5176)
- `GET /api/stats` - Statistiques générales
- `CRUD /api/templates` - Gestion des templates
- `CRUD /api/components` - Gestion des composants
- `GET /api/analytics` - Analyses des prompts

## Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## License

MIT License - voir le fichier LICENSE pour plus de détails.
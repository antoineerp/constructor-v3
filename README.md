# Constructor V3 🚀

> Outils ajoutés: Prettier (Svelte + Tailwind) & script de formatage programmatique.

Scripts utiles:

```bash
npm run format   # Prettier --write .
npm run lint     # (placeholder ESLint si config active)
```

### Ingestion composants externes (prototype)

Ingestion locale d'une librairie de composants Svelte (copie snapshot sans réseau):

```bash
node apps/main/tools/ingest-external.mjs skeleton /chemin/vers/mes/sources/skeleton
```

Résultat: fichiers sous `apps/main/src/lib/external/skeleton/components/` + `meta.json`.


Config Prettier: `prettier.config.cjs`.
Format programmatique: `apps/main/tools/format-files.mjs` (entrée JSON { files: { path: code } }).


**Générateur d'applications SvelteKit basé sur l'IA**

Constructor V3 est une plateforme innovante qui permet de créer des applications web SvelteKit complètes en décrivant simplement vos besoins en langage naturel. L'IA analyse votre demande, sélectionne les templates appropriés, et génère du code de haute qualité que vous pouvez voir en temps réel et affiner par itérations.

## ✨ Fonctionnalités principales

### 🤖 Chat IA Intelligent
- **Analyse avancée** des prompts utilisateur
- **Sélection automatique** de templates et composants
- **Génération de code SvelteKit** optimisé
- **Itérations intelligentes** basées sur vos retours

### 💻 Éditeur Monaco Intégré  
- **Syntaxe highlighting** pour Svelte, TypeScript, CSS
- **Autocomplétion** intelligente avec snippets SvelteKit
- **Validation en temps réel** du code généré
- **Thèmes personnalisés** (sombre/clair)

### 👁️ Preview Temps Réel
- **Hot reloading ultra-rapide** avec Vite
- **Environnement isolé** sécurisé dans iframe
- **Mise à jour instantanée** à chaque modification
- **Responsive design** pour tester sur tous les écrans

### 🤝 Collaboration Temps Réel
- **Curseurs partagés** entre utilisateurs
- **Synchronisation automatique** des modifications
- **Chat intégré** pour communiquer
- **Gestion des conflits** intelligente

### 📊 Dashboard Admin
- **Métriques d'utilisation** détaillées
- **Gestion des templates** et composants
- **Analyse des prompts** populaires
- **Optimisation continue** de l'IA

## 🏗️ Architecture

```
constructor-v3/
├── 🎯 apps/
│   ├── main/      # Interface principale (5173)
│   ├── preview/   # Preview isolée (5174)
│   └── admin/     # Dashboard admin (5176)
├── 📦 packages/
│   ├── ui/        # Composants réutilisables
│   ├── db/        # Utilitaires Supabase
│   ├── ai/        # Logique IA (LangChain/OpenAI)
│   └── editor/    # Monaco + collaboration
├── 🛠️ scripts/    # Scripts utilitaires
└── 📚 docs/       # Documentation
```

## 🚀 Démarrage rapide

### 1. Installation

```bash
# Cloner le repository
git clone https://github.com/antoineerp/constructor-v3
cd constructor-v3

# Installer les dépendances
pnpm install
```

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Ajouter vos clés API
nano .env
```

Variables requises :
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_key
OPENAI_API_KEY=sk-your_key
```

### 3. Base de données

```bash
# Initialiser les tables Supabase (voir docs/TECHNICAL_GUIDE.md)
# Puis charger les templates par défaut
pnpm run init-templates
```

### 4. Lancement

```bash
# Démarrer toutes les applications
pnpm run dev

# Ou individuellement
pnpm run dev:main     # Interface principale
pnpm run dev:preview  # Preview isolée  
pnpm run dev:admin    # Dashboard admin
```

🎉 **Votre Constructor V3 est prêt !**
- Interface principale : http://localhost:5173
- Preview isolée : http://localhost:5174  
- Dashboard admin : http://localhost:5176

## 🎯 Comment ça marche

### 1. **Décrivez votre projet**
```
"Je veux un site e-commerce pour vendre des vêtements avec 
panier, paiement Stripe et tableau de bord vendeur"
```

### 2. **L'IA analyse et propose**
- Type de projet détecté : **E-commerce**
- Template recommandé : **E-commerce Moderne**  
- Composants suggérés : **ProductCard, Cart, Dashboard**

### 3. **Code généré instantanément**
```svelte
<!-- Exemple de code généré -->
<script>
  import { cart } from '$lib/stores/cart';
  import ProductCard from '$lib/components/ProductCard.svelte';
  
  let products = [];
  // Logique générée automatiquement...
</script>

<div class="product-grid">
  {#each products as product}
    <ProductCard {product} />
  {/each}
</div>
```

### 4. **Preview temps réel**
Voir immédiatement le résultat dans l'environnement isolé.

### 5. **Affinage par feedback**
```
"Peux-tu ajouter un filtre par catégorie et changer 
les couleurs pour du bleu ?"
```

### 6. **Export et déploiement**
- Télécharger le code en ZIP
- Déployer directement sur Vercel
- Continuer le développement localement

## 🛠️ Stack technique

### Frontend
- **SvelteKit 2.5+** - Framework principal avec SSR
- **TailwindCSS** - Styling utilitaire et responsive
 - **Storybook** - Documentation interactive des composants (port 6006)

### Embeddings & Réutilisation de code
Système d'indexation des fichiers validés (pgvector) :
1. Chaque fichier sans erreurs (ESLint + Prettier + compile + svelte-check) déclenche un upsert dans `code_snippets`.
2. Recherche sémantique via `/api/snippets/search` (cosine).
3. Modèle embeddings par défaut: `text-embedding-3-small` (modifiable via `EMBEDDINGS_MODEL`).

Table (extrait) :
```
id uuid PK | path text | hash unique | kind text | language text | embedding vector(1536) | content text | summary text
```

### Auth & RLS
Hook `hooks.server.js` attache `locals.user` si header `Authorization: Bearer <token>` Supabase valide.
Policies RLS proposées (fichier `apps/main/RLS_AND_LOGS.sql`).

### Logging génération / réparation
Table `generation_logs` (insertion lors de `site/generate` et auto-repair) :
```
type: generation|auto-repair, pass_count, meta(JSON), duration_ms
```

### CI / Qualité
Script `pnpm ci` : lint + check + test + build.
Script `pnpm ci:storybook` : build statique Storybook.

### Variables d’environnement Storybook
Les variables `PUBLIC_*` sont injectées dans Storybook via `viteFinal` (fichier `.storybook/main.js`).

### Sécurité clés
Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` côté client (non utilisée par le code client). Vérifier avant déploiement.

- **Monaco Editor** - Éditeur de code professionnel
- **Socket.io** - Collaboration temps réel
- **Vite** - Build tool ultra-rapide

### Backend  
- **Supabase** - Base de données PostgreSQL + Auth
- **OpenAI GPT-4o-mini** - Génération de code IA
- **LangChain** - Orchestration et prompts IA
- **Node.js** - Runtime serveur

### Infrastructure
- **TurboRepo** - Monorepo avec cache intelligent
- **pnpm** - Gestionnaire de paquets rapide
- **Vercel** - Déploiement et hosting
- **Docker** - Containerisation (optionnel)

## 📖 Documentation

- **[Guide technique complet](docs/TECHNICAL_GUIDE.md)** - Architecture détaillée
- **[Guide utilisateur](docs/README.md)** - Comment utiliser l'interface

## 🎨 Templates disponibles

| Template | Description | Composants inclus |
|----------|-------------|-------------------|
| **E-commerce** | Boutique complète | ProductCard, Cart, Checkout, Dashboard |
| **CRM** | Gestion client | ClientCard, Pipeline, Reports, Analytics |
| **Blog** | Site de contenu | ArticleCard, Categories, Comments, SEO |
| **Portfolio** | Vitrine créative | ProjectCard, Gallery, Contact, About |
| **SaaS** | Application métier | Dashboard, Billing, Users, Settings |
| **Landing** | Page de vente | Hero, Features, Testimonials, Pricing |

## 🤝 Contribution

Constructor V3 est un projet open-source ! Pour contribuer :

1. **Fork** le repository
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Committer** vos changements (`git commit -m 'Add amazing feature'`)
4. **Pousser** vers la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

## 📝 License

Ce projet est sous licence **MIT**.

---

<div align="center">

**Fait avec ❤️ par l'équipe Constructor V3**

</div>
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
yarn dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build --filter=docs

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build --filter=docs
yarn exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters):

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev --filter=web

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

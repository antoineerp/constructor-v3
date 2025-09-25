# 🚀 Configuration Rapide Supabase - Constructor V3

## Étapes de Configuration

### 1. **Créer un projet Supabase**
1. Allez sur [app.supabase.com](https://app.supabase.com/)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Choisissez votre organisation
5. Donnez un nom à votre projet (ex: `constructor-v3`)
6. Choisissez la région la plus proche
7. Générez un mot de passe sécurisé pour la base de données
8. Cliquez sur "Create new project"
9. **Attendez 2-3 minutes** que le projet soit initialisé ⏰

### 2. **Récupérer les clés API**
1. Dans votre dashboard Supabase, allez dans **Settings** → **API**
2. **Copiez ces informations importantes :**
   - **Project URL** : `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **anon/public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key** (optionnel pour l'admin)

### 3. **Configurer Constructor V3**

#### Option A : Script automatique
```bash
cd /workspaces/constructor-v3
./configure-supabase.sh
```

#### Option B : Configuration manuelle
Mettez à jour le fichier `.env` :
```env
SUPABASE_URL=https://votre-projet.supabase.co
PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. **Initialiser la base de données**
1. Dans Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez-collez le contenu du fichier `supabase-schema.sql`
4. **Exécutez la requête** (bouton "Run")
5. Créez une nouvelle requête
6. Copiez-collez le contenu du fichier `supabase-data.sql`
7. **Exécutez cette requête** aussi

### 5. **Tester la connexion**
```bash
pnpm run dev
```
Puis allez sur : **http://localhost:5173/supabase-config**

## ✅ Vérifications

Si tout fonctionne, vous devriez voir :
- ✅ **Connexion réussie** dans la page de configuration
- **6 templates** disponibles (e-commerce, blog, portfolio, etc.)
- **5 composants** de base (Button, Card, Header, etc.)
- Possibilité de créer des projets de test

## 🔧 Dépannage

### Erreur de connexion
- Vérifiez que votre **Project URL** est correcte
- Vérifiez que votre **anon key** est complète et valide
- Assurez-vous que le projet Supabase est **complètement initialisé** (pas encore en cours)

### Erreur "Table doesn't exist"
- Vous n'avez pas exécuté le script `supabase-schema.sql`
- Allez dans **SQL Editor** et exécutez le schéma de base de données

### Pas de données de test
- Exécutez le script `supabase-data.sql` dans l'éditeur SQL
- Cela ajoutera 6 templates et 5 composants par défaut

## 🌟 Fonctionnalités Disponibles

Une fois configuré, vous aurez accès à :

### Interface Utilisateur (`/user`)
- 📊 **Dashboard** avec statistiques des projets
- ➕ **Création de projets** avec prompts IA
- 👁️ **Preview** des projets générés
- 💾 **Gestion des projets** (modifier, supprimer)

### Interface Admin (`/admin`)
- 📈 **Tableau de bord** avec métriques
- 🗂️ **Gestion des projets** de tous les utilisateurs
- 🏗️ **CRUD Templates** (créer, modifier, supprimer)
- 🧩 **CRUD Composants** réutilisables
- 📊 **Statistiques d'usage** détaillées

### Configuration (`/supabase-config`)
- 🔌 **Test de connexion** en temps réel
- 📋 **Visualisation des données** (templates, composants, projets)
- 🔍 **Diagnostic** des problèmes de configuration

## 🚀 Prochaines Étapes

1. **Configurez OpenAI** pour la génération de code IA
2. **Testez la création** de projets via l'interface utilisateur
3. **Personnalisez les templates** via l'interface admin
4. **Déployez sur Vercel** pour la production

---

**🎉 Votre plateforme Constructor V3 est maintenant connectée à Supabase !**
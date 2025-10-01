# 🎨 Migration vers Studio Unifié - Plan et Documentation

## 📋 **Vue d'ensemble**

Cette migration consolide toutes les pages dispersées (générateur, sandbox, chat, preview) en une **seule page Studio** moderne, claire et fonctionnelle.

---

## 🗂️ **Avant la migration - Pages existantes**

### Pages principales :
1. **`/` (home)** - Page d'accueil avec liens vers générateur/sandbox
2. **`/generator`** - Génération de projets (ChatGenerator + SiteGenerator)
3. **`/sandbox`** - Test de composants Svelte en temps réel
4. **`/user`** - Gestion utilisateur et projets
5. **`/auth`** - Authentification
6. **`/admin`** - Administration
7. **`/supabase-config`** - Configuration Supabase

### Composants clés :
- `ChatGenerator.svelte` - Chat IA pour génération
- `SiteGenerator.svelte` - Générateur de sites complets
- `PreviewFrame.svelte` - Aperçu iframe sécurisé

### Problèmes identifiés :
- ❌ Navigation fragmentée (3-4 pages pour une seule tâche)
- ❌ Duplication de code (config, providers, profiles)
- ❌ UX confuse (où aller pour générer/tester/voir ?)
- ❌ Maintenance difficile (logique éparpillée)

---

## 🎯 **Après la migration - Architecture Studio**

### Page unique : `/studio`

#### **Structure en onglets :**

1. **🚀 Générer**
   - Génération par chat IA (ChatGenerator)
   - Génération de site complet (SiteGenerator)
   - Configuration centralisée (provider, profile, mode)

2. **📁 Fichiers**
   - Arborescence des fichiers générés
   - Éditeur de code avec coloration syntaxique
   - Copie rapide du code

3. **👁️ Aperçu**
   - Preview iframe sécurisé (PreviewFrame)
   - Affichage du projet généré
   - Rechargement à la demande

4. **🛠️ Sandbox**
   - Éditeur Svelte en temps réel
   - Test rapide de composants
   - Aperçu instantané

---

## 📦 **Nouveau fichier créé**

### `/routes/studio/+page.svelte`

**Fonctionnalités :**
- ✅ Navigation par onglets (generate, files, preview, sandbox)
- ✅ Configuration globale (provider, profile, simpleMode)
- ✅ Gestion d'état centralisée
- ✅ Intégration des composants existants
- ✅ Design moderne et responsive
- ✅ Header/Footer informatifs

**Technologies :**
- Svelte 5 (runes)
- TailwindCSS pour le styling
- Réutilisation des composants existants

---

## 🔄 **Plan de migration (étapes)**

### **Phase 1 : Création et test** ✅
- [x] Créer `/routes/studio/+page.svelte`
- [ ] Tester la navigation entre onglets
- [ ] Vérifier l'intégration des composants

### **Phase 2 : Redirection**
- [ ] Modifier `/` (home) pour rediriger vers `/studio`
- [ ] Ajouter des messages de migration sur `/generator` et `/sandbox`
- [ ] Mettre à jour les liens dans la navigation

### **Phase 3 : Amélioration**
- [ ] Ajouter sauvegarde automatique de l'état
- [ ] Implémenter historique des générations
- [ ] Ajouter export de projet (ZIP)
- [ ] Améliorer l'éditeur de code (Monaco ou CodeMirror)

### **Phase 4 : Nettoyage**
- [ ] Supprimer `/generator/+page.svelte` (obsolète)
- [ ] Supprimer `/sandbox/+page.svelte` (obsolète)
- [ ] Nettoyer les routes inutilisées
- [ ] Mettre à jour la documentation

---

## 🎨 **Avantages de la nouvelle architecture**

### **Pour l'utilisateur :**
- ✅ **Navigation simplifiée** : tout est accessible depuis une seule page
- ✅ **Workflow clair** : générer → éditer → prévisualiser
- ✅ **Rapidité** : pas de rechargement de page entre les actions
- ✅ **Expérience fluide** : onglets instantanés, état préservé

### **Pour le développement :**
- ✅ **Code centralisé** : logique dans un seul fichier
- ✅ **Maintenance facile** : moins de duplication
- ✅ **Évolutivité** : facile d'ajouter des onglets/features
- ✅ **Testabilité** : composants réutilisables

---

## 📊 **Comparaison avant/après**

| Aspect | Avant (Multi-pages) | Après (Studio) |
|--------|---------------------|----------------|
| **Fichiers** | 3+ pages | 1 page |
| **Navigation** | Liens externes | Onglets |
| **État** | Non persistant | Persistant |
| **Config** | Dupliquée 3x | Centralisée |
| **UX** | Fragmentée | Fluide |
| **Maintenance** | Difficile | Simple |

---

## 🚀 **Prochaines étapes recommandées**

### **Court terme (cette semaine) :**
1. Tester `/studio` en local
2. Corriger les bugs éventuels
3. Améliorer le styling si nécessaire
4. Rediriger `/` vers `/studio`

### **Moyen terme (ce mois) :**
1. Ajouter sauvegarde localStorage
2. Implémenter export ZIP
3. Améliorer l'éditeur (Monaco)
4. Ajouter drag & drop de fichiers

### **Long terme :**
1. Ajouter gestion de projets multiples
2. Intégrer versionning (git-like)
3. Ajouter collaboration temps réel
4. Marketplace de templates

---

## 🛠️ **Comment tester maintenant**

1. **Accéder à la page** :
   ```
   http://localhost:5173/studio
   ```

2. **Tester chaque onglet** :
   - Générer : tester ChatGenerator et SiteGenerator
   - Fichiers : vérifier la liste et l'éditeur
   - Aperçu : vérifier le PreviewFrame
   - Sandbox : tester l'éditeur rapide

3. **Vérifier la configuration** :
   - Changer de provider (OpenAI/Claude)
   - Changer de profile (Safe/Enhanced)
   - Activer/désactiver mode simple

---

## 📝 **Notes techniques**

### **Composants réutilisés :**
- `SiteGenerator.svelte` - Inchangé
- `ChatGenerator.svelte` - Inchangé
- `PreviewFrame.svelte` - Inchangé

### **État géré :**
```javascript
{
  provider: 'openai',
  generationProfile: 'safe',
  simpleMode: false,
  activeTab: 'generate',
  generatedFiles: null,
  selectedFile: null,
  sandboxCode: '...'
}
```

### **Events à implémenter :**
- `on:filesGenerated` - Déclenché après génération
- `on:fileSelected` - Sélection d'un fichier
- `on:compile` - Compilation sandbox

---

## ✅ **Checklist de migration**

- [x] Créer `/routes/studio/+page.svelte`
- [x] Documenter l'architecture
- [ ] Tester en local
- [ ] Corriger les bugs
- [ ] Déployer sur Vercel
- [ ] Rediriger les anciennes pages
- [ ] Supprimer le code obsolète
- [ ] Mettre à jour README.md

---

**🎉 La nouvelle architecture est prête ! Testons maintenant.**

Pour déployer : `git add . && git commit -m "feat: Studio unifié" && git push`

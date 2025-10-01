# 🏗️ ARCHITECTURE - Constructor v3

## 📊 DIAGNOSTIC COMPLET (Oct 1, 2025)

### 🚨 PROBLÈME IDENTIFIÉ
- **Trop de systèmes de compilation** qui se marchent dessus
- **Erreurs d'hydration** causées par import map mal configuré
- **Code générique** car prompts IA pas assez spécifiques
- **Confusion** entre preview temporaire, sandbox, SSR, etc.

---

## 🎯 SYSTÈMES DE PREVIEW/COMPILATION

### 1️⃣ **PREVIEW TEMPORAIRE** (Principale - À GARDER)
**Endpoint:** `/api/projects/temporary/compile`  
**Usage:** Preview temps réel pendant la génération  
**Input:** `{ files: Record<string, string> }`  
**Output:** HTML avec import map + data URLs  
**Statut:** ✅ FIXÉ (commit 8d36875)

**Fonctionnement:**
1. Compile TOUS les fichiers Svelte → modules
2. Crée data URLs pour chaque module
3. Import map avec data URLs (pas de fichiers externes)
4. HTML standalone avec Skeleton CSS + Tailwind
5. Bootstrap avec `await import(entryModule)`

**Avantages:**
- ✅ Pas besoin de DB
- ✅ Preview instantané
- ✅ Import map fonctionne (data URLs)
- ✅ Skeleton UI + Tailwind intégrés

**Problèmes résolus:**
- ❌ "Failed to resolve module specifier 'svelte'" → ✅ Data URLs
- ❌ Import map cherchait ./m0.js → ✅ data:text/javascript

---

### 2️⃣ **COMPILATION PROJET SAUVÉ** (À GARDER)
**Endpoint:** `/api/projects/[id]/compile`  
**Usage:** Compilation projet sauvé en DB  
**Input:** `projectId` + optionnel `{ files }`  
**Output:** Modules compilés + wrappers routing + HTML  
**Statut:** ⚠️ COMPLEXE (516 lignes)

**Fonctionnalités:**
- Charge projet depuis Supabase (ou fallback mémoire)
- Compile Svelte → modules DOM
- Génère wrappers pour routing SvelteKit
- Build Tailwind CSS (cache 2min)
- Validation imports/routes
- Auto-fix suggestions
- Import map + HTML runtime

**Questions:**
- ❓ Est-ce qu'on a besoin du routing complet ?
- ❓ Les wrappers sont-ils utilisés ?
- ❓ Peut-on simplifier sans casser ?

---

### 3️⃣ **DIAGNOSTIC COMPILE** (À SUPPRIMER ?)
**Endpoint:** `/api/diagnostic/compile`  
**Usage:** Tests de compilation Svelte  
**Statut:** 🤔 Redondant ?

**Action recommandée:**
- Vérifier si utilisé quelque part
- Si non → SUPPRIMER pour simplifier

---

## 🔄 FLUX ACTUEL

```mermaid
graph TD
    A[Studio Page] --> B{Type de preview}
    B -->|Temporary| C[/api/projects/temporary/compile]
    B -->|Saved| D[/api/projects/[id]/compile]
    C --> E[PreviewFrame iframe]
    D --> E
    E --> F[HTML runtime avec import map]
```

---

## 🎨 GÉNÉRATION IA

### Prompts (openaiService.js)

**System Prompt:**
```
Tu es un architecte Senior SvelteKit spécialisé en SKELETON UI.
🎨 UI FRAMEWORK OBLIGATOIRE: Utilise @skeletonlabs/skeleton pour TOUS les composants.
- Import: import { AppBar, Card, Button, Modal, etc } from '@skeletonlabs/skeleton';
- Classes: btn variant-filled-primary, card, variant-soft, surface-*, primary-*
```

**Injection automatique:**
- ✅ Skeleton 3.2.2 dans package.json
- ✅ @skeletonlabs/tw-plugin dans devDependencies
- ✅ Tailwind config avec Skeleton plugin
- ✅ Layout avec imports Skeleton CSS

**Providers:**
- OpenAI GPT-4o-mini (défaut)
- Claude Sonnet (si clé configurée)

---

## 📦 STACK UI

### StackRouter (stackRouter.ts)

**Scoring:**
- Skeleton: +5 par défaut
- Dashboard/SaaS: +3 Skeleton
- Docs: +3 Skeleton
- Theming: +4 Skeleton
- Forms: +2 Skeleton
- Speed: +3 Skeleton

**Résultat:** Skeleton gagne presque toujours (intentionnel)

---

## 🐛 ERREURS RÉCENTES RÉSOLUES

### 1. Build error: +server.OLD.js
**Commit:** 8f2c6bc  
**Cause:** Fichier `+` réservé par SvelteKit  
**Fix:** Suppression du fichier

### 2. Hydration error: Failed to resolve module specifier 'svelte'
**Commit:** 8d36875  
**Cause:** Import map pointait vers ./m0.js (fichier inexistant)  
**Fix:** Data URLs au lieu de chemins relatifs

### 3. Code IA générique sans Skeleton
**Commit:** 7b1e8cf  
**Cause:** Prompt système neutre  
**Fix:** Prompt "architecte Skeleton UI" + exemples

---

## ✅ RECOMMANDATIONS

### 🎯 GARDER (Essentiels)
1. `/api/projects/temporary/compile` - Preview temps réel
2. `/api/projects/[id]/compile` - Compilation projets sauvés
3. `PreviewFrame.svelte` - Iframe preview
4. `openaiService.js` - Génération IA
5. `stackRouter.ts` - Choix UI framework

### 🗑️ À SUPPRIMER (Redondants)
1. `/api/diagnostic/compile` - Si inutilisé

### 🔧 À SIMPLIFIER
1. `/api/projects/[id]/compile` - 516 lignes, trop complexe ?
   - Garder compilation base
   - Simplifier wrappers routing ?
   - Réduire cache/validation ?

### 📝 À DOCUMENTER
1. Flow complet de génération → compilation → preview
2. Différence entre temporary/[id]/compile
3. Format attendu de `files` object
4. Exemples d'utilisation

---

## 🚀 PROCHAINES ÉTAPES

1. ⏳ **Attendre build Vercel** (commit 8d36875)
2. 🧪 **Tester preview:** "dashboard avec stats"
3. 👀 **Vérifier console:** Plus d'erreur 'svelte'
4. 📊 **Analyser code généré:** Skeleton UI présent ?
5. 🧹 **Nettoyer endpoints inutilisés**
6. 📚 **Documenter architecture finale**

---

## 📞 SUPPORT

**Si erreur persiste:**
1. Ouvrir console navigateur (F12)
2. Copier erreur complète
3. Vérifier Network tab → temporary/compile response
4. Partager HTML généré dans response

**Dernière mise à jour:** Oct 1, 2025 - Commit 8d36875

# 🛡️ Migration Sécuritaire - Architecture Bolt.new

## ✅ Refactoring de sécurité terminé

Cette application utilise maintenant une architecture **client-side uniquement** comme Bolt.new/Lovable.dev pour éliminer les vulnérabilités SSR.

### 🔒 Sécurité renforcée

1. **SSR complètement désactivé** - Plus d'exécution server-side du code IA
2. **Validation centralisée** - `/lib/security/validation.js` avec patterns dangereux
3. **Sandbox iframe** - Isolation complète dans le navigateur client
4. **Compilation sécurisée** - Génération HTML sans exécution server

### 🚀 Nouveaux composants

- **PreviewFrame.svelte** - Composant d'aperçu sécurisé (style Bolt.new)
- **validation.js** - Configuration de sécurité centralisée
- **SiteGenerator.svelte** - Interface simplifiée sans SSR dangereux

### 📋 Endpoints

- ❌ `/api/projects/[id]/preview` - **DEPRECATED** (SSR dangereux)
- ✅ `/api/projects/[id]/compile` - Compilation sécurisée
- ✅ `/api/projects/temporary/compile` - Compilation temporaire

### 🎯 Approche de sécurité

```
Code IA généré → Compilation serveur → HTML sécurisé → Iframe client
                                    (pas d'exécution)   (isolation complète)
```

### 🧪 Tests recommandés

1. Générer une application Svelte
2. Vérifier que l'aperçu s'affiche dans l'iframe
3. Confirmer qu'aucun code ne s'exécute côté serveur
4. Tester la validation de sécurité

### 📚 Références

- [Bolt.new](https://bolt.new) - Architecture client-side de référence
- [Lovable.dev](https://lovable.dev) - Sandbox sécurisé
- [v0.dev](https://v0.dev) - Compilation sans exécution

**Architecture sécurisée ✅ - Prêt pour production !**
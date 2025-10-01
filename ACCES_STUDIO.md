# 🎨 Accès au Studio Constructor V3

## 🌐 URLs d'accès

### Production (Vercel)
```
https://constructor-v3-6em92pbya-antoines-projects-66ebf1a0.vercel.app/studio
```

**Note:** La page racine `/` redirige automatiquement vers `/studio`

### Développement local
```bash
# Démarrer le serveur
cd apps/main
pnpm run dev

# Ouvrir dans le navigateur
http://localhost:5173/studio
```

---

## 📱 Interface du Studio

### Onglets disponibles :

1. **🤖 Générer** (par défaut)
   - Chat Generator (conversation avec l'IA)
   - Site Generator (génération structurée)

2. **📁 Fichiers**
   - Explorateur des fichiers générés
   - Éditeur de code Monaco
   - Actions: télécharger, copier, etc.

3. **👁️ Aperçu**
   - Preview frame interactive
   - Refresh automatique
   - Iframe sandbox sécurisé

4. **🧪 Sandbox**
   - Test rapide de composants Svelte
   - Compilation live
   - Pas besoin de projet complet

5. **🐛 Debug**
   - Logs de génération
   - Meta informations
   - État du système

---

## 🔧 Configuration

### Provider AI
- **OpenAI** (par défaut)
- Claude

### Profils de génération
- **Safe** : Génération sécurisée, pas de libs externes
- **Enhanced** : Plus de fonctionnalités
- **External Libs** : Autorise les bibliothèques externes

### Mode simple
- Active pour une interface simplifiée
- Désactive pour options avancées

---

## 🚀 Utilisation rapide

### Générer un site complet :
1. Aller sur `/studio`
2. Cliquer sur "Site Generator"
3. Entrer le prompt (ex: "Un blog avec dark mode")
4. Attendre la génération
5. Voir les fichiers dans l'onglet "Fichiers"
6. Preview dans l'onglet "Aperçu"

### Tester un composant :
1. Aller sur `/studio`
2. Cliquer sur l'onglet "Sandbox"
3. Écrire du code Svelte
4. Voir le résultat en direct

---

## 🔗 Routes disponibles

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Redirection vers `/studio` | ✅ |
| `/studio` | Interface principale unifiée | ✅ |
| `/admin` | Dashboard admin (legacy) | ⚠️ |
| `/api/*` | 50+ endpoints API | ✅ |

---

## 🐛 Troubleshooting

### "Page not found" sur Vercel
→ Vérifie que tu accèdes bien à `/studio` pas juste `/`

### La redirection ne marche pas
→ Vide le cache du navigateur (Ctrl+Shift+R)

### Le Studio ne charge pas
→ Vérifie la console navigateur (F12)
→ Regarde les logs Vercel

### Erreur de compilation
→ Vérifie que les dépendances sont installées (`pnpm install`)

---

## 📊 Performance

- **Temps de chargement** : ~2s (première visite)
- **Bundle size** : ~450KB (après optimisation Phase 1)
- **Cold start API** : ~3s (serverless)
- **Génération moyenne** : 10-30s selon complexité

---

**Dernière mise à jour:** 1er octobre 2025

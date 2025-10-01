# Scripts Obsolètes

## ❌ seedLibraryComponents.js

**Status:** DEPRECATED  
**Raison:** Supabase complètement supprimé le 1er octobre 2025

Ce script était utilisé pour insérer des composants dans la table Supabase `components`.

### Alternative actuelle:
Les composants sont maintenant gérés via:
- `/api/catalog` - Catalogue statique
- `/api/library` - Bibliothèque en mémoire
- `packages/ai/src/lib/templates.js` - Templates hardcodés

### Si besoin de réactiver:
1. Installer une DB (Postgres, Supabase, Turso, etc.)
2. Adapter le script pour la nouvelle DB
3. Mettre à jour les endpoints API pour utiliser la DB

---

**Fichier conservé pour référence historique uniquement.**

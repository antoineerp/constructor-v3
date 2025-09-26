# Pipeline Génération & Validation Svelte

Ce document décrit le flux cible pour fiabiliser la génération de code Svelte par l'IA.

## Étapes
1. Génération (API interne) -> fichiers en mémoire
2. Normalisation rapide (trim, suppression doublons, harmonisation extensions)
3. Formatage Prettier (`npm run format`)
4. Lint ESLint + règles Svelte (`npm run lint`)
5. Vérification types & erreurs Svelte (`npm run check`)
6. Compilation SSR / DOM interne (endpoints `/api/compile/...`) pour valider exécution
7. Stockage (DB) + mise à disposition UI (onglets Code / Rendu SSR / Interactif)

## Commande combinée
```
npm run gen:validate
```

## Points à ajouter (roadmap)
- Auto‑correction basique (ex: fermer balises, ajouter export let manquant) avant rerun lint
- Relance ciblée IA sur fichiers en échec (prompt de réparation contextuel)
- Badge de statut par fichier dans l'UI
- Export ZIP post‑validation

## Règles ESLint importantes
- `no-console` warn (garder erreurs seulement)
- Types optionnels; `any` autorisé pour laisser l'IA produire rapidement puis raffiner

## Améliorations futures
- WebContainers pour preview isolée sans back‑end
- Analyse statique accessibilité (axe + svelte-a11y)
- Score de qualité (syntaxe, a11y, taille / complexité)

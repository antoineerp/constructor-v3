# Bibliothèque de Prompts (Première Ébauche)

Ce fichier centralise les intentions et règles clés utilisées dans la génération.

## Enveloppe JSON
Toujours que possible envelopper les réponses structurées :

```
<<<JSON_START>>>
{ ... }
<<<JSON_END>>>
```

## 1. Blueprint
Objectif: produire un blueprint cohérent pour un site SvelteKit.

Principes:
- Aucune sortie hors JSON
- 3–5 articles si type blog
- Couleurs hex toujours préfixées de `#`
- Fournir `recommended_prompts.per_file`

Pivot futur: intégrer un schéma JSON formel (Responses API / json_schema).

## 2. Intent Expansion
But: enrichir la requête utilisateur courte en ajoutant style, ton, features plausibles.

Sortie strict JSON : original_query, enriched_query (<280 chars), style_keywords[], feature_hints[], tone_keywords[].

## 3. Génération multi-fichiers (single-pass)
Contraintes clés:
- Strict JSON (objet) max N fichiers
- Inclure fichiers essentiels (README.md, package.json, src/routes/+page.svelte)
- Aucune dépendance externe sauf profil l’autorise
- Réutiliser composants catalogues si listés

## 4. Génération per-file
Fichier ciblé unique. Retour : `{ "<filename>": "CONTENU" }`.
- Doit être valide Svelte
- Aucun commentaire superflu

## 5. Régénération ciblée (refine)
But: améliorer accessibilité, cohérence palette, structure.
Ajouter patch minimal, pas réinvention totale.

## 6. Stratégies futures (à implémenter)
- Prompt critique (analyse & patch)
- Prompt doc résumé (résumer code généré en documentation technique)
- Prompt test (génération tests de base via export de composants)

---
Ce document sera versionné ; toute modification substantielle des prompts dans le code doit être répercutée ici.
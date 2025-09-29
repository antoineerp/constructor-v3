# Chaîne de Blueprints & Validation UI

## Objectif
Fournir un registre de templates SvelteKit validés et une double filière de compilation:
- Preview Rapide (navigateur) : `svelte/compiler` dans un Web Worker + sandbox iframe.
- Aperçu Fidèle (serveur) : build SvelteKit réel (Vite) avec mêmes versions que blueprint puis rendu dans iframe.

## Librairies approuvées
- Skeleton (@skeletonlabs/skeleton)
- Flowbite (flowbite + flowbite-svelte)
- Bits UI (bits-ui)
- shadcn-svelte (distribution de code + lucide-svelte)

## Registre
Fichier: `apps/main/src/lib/blueprints/registry.ts`
Contient pour chaque blueprint: versions exactes (svelte, kit, vite, tailwind) + deps runtime + dev deps de validation.

## Validation
1. `svelte-check` (types, a11y) obligatoire.
2. ESLint (règles Svelte + Tailwind) via config monorepo.
3. (Optionnel) Prettier auto avant build.
4. Échec dur si warnings transformés en erreurs (--fail-on-warnings possible si besoin).

## Workflow Suggestion
1. Génération de code → Guardrails (inject tailwind.config.cjs si absent, app.css, etc.).
2. Preview rapide immédiate (Worker) pendant que le serveur peut lancer une build fidèle async.
3. À la demande de l'utilisateur: bascule vers "aperçu fidèle" quand build terminée (événements SSE ou polling).
4. Publish: Re-valider (safety) + déployer (Vercel) ou packager (zip) en réutilisant artefacts.

## Fichiers Clés
- Worker: `apps/main/src/lib/compile/worker.ts`
- API compile (SSR + hydratation) : `apps/main/src/routes/api/compile/component/+server.js`
- Rapid helper: `apps/main/src/lib/compile/rapidCompiler.ts`

## Intégration Tailwind
`packages/config/src/tailwind.config.cjs` étendu pour scruter libs (flowbite, skeleton) + plugins skeleton & flowbite.

## Roadmap Potentielle
- Ajout d'un overlay d'erreurs hydratation dans l'iframe.
- CLI interne pour synchroniser composants shadcn-svelte dans `packages/ui`.
- Cache compilations rapides (hash code) côté Worker.
- Tests vitest couvrant pipeline preview vs fidèle.

## Mise à Jour Versions
Le registre doit être régénéré lors de bump Svelte/Kit: script futur `scripts/update-blueprints.js`.

---
Pour toute modification majeure, documenter ici.

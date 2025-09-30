// Bibliothèque centralisée de templates de prompts réutilisables.
// Chaque template est une fonction pure retournant une string.
// Convention: ne jamais inclure d"injections dynamiques directement – passer via params.

export const promptLibrary = {
  blueprintBase: ({ query }) => `Tu es un architecte produit. Élaborer un blueprint JSON pour: "${query}".
Règles:
- Sortie = UNIQUE objet JSON strict (AUCUN texte hors JSON)
- Inclure: original_query, detected_site_type, audience, goals, keywords, seo_meta, color_palette, routes, core_components, data_models, sample_content, generation_strategy, recommended_prompts.
- color_palette: 4 à 6 couleurs hex (#...)
- routes: array d'objets { path, purpose, sections? }
- sample_content: articles/products/invoices selon besoin.
`,

  perFile: ({ filename }) => `Tu génères UNIQUEMENT le fichier: ${filename}.
Retourne JSON: { "${filename}": "CONTENU" } sans texte additionnel.`,

  criticFix: ({ diagnosticsCount }) => `Corrige les fichiers en t'appuyant sur diagnostics (${diagnosticsCount}). Retourne JSON {"filename":"CONTENU",...}`,

  regenerateProblematic: ({ filename }) => `Améliore le fichier ${filename} pour cohérence tokens, accessibilité et structure Tailwind moderne. JSON strict: { "${filename}": "CONTENU" }`,

  appSinglePass: ({ fileCount }) => `Génère application SvelteKit complète en <= ${fileCount} fichiers. Sortie: objet JSON strict.`,

  enrichArticles: ({ query }) => `Réécris sample_content.articles avec titres spécifiques (req: ${query}). JSON: { "sample_content": { "articles": [...] } }`,

  intentExpansion: ({ query }) => `Enrichis intention utilisateur: ${query}. JSON strict { original_query,enriched_query,style_keywords,feature_hints,tone_keywords }`
  ,
  applicationBase: ({ query, maxFiles=20 }) => `Génère une application SvelteKit moderne et professionnelle basée sur: "${query}".
Retourne STRICTEMENT un objet JSON { "filename":"CONTENU", ... } (aucun texte hors JSON).

QUALITÉ NIVEAU PRODUCTION:
- Design moderne avec gradients, ombres, espacements harmonieux
- Couleurs cohérentes et palette attrayante
- Icônes Font Awesome partout où pertinent (fas fa-*)
- Images d'illustration (via Unsplash URLs dans <img src="https://images.unsplash.com/...">)
- Micro-interactions et états hover/focus
- Typography riche avec variété de tailles/poids de fonts
- Layouts responsive et professional

CONTENU RICHE:
- Données réalistes et pertinentes (pas de Lorem Ipsum)
- Textes spécifiques au domaine demandé
- Call-to-actions engageants
- Navigation multi-pages avec liens fonctionnels
- Sections complètes (hero, features, testimonials, footer)

TECHNIQUE:
- Max ${maxFiles} fichiers optimaux
- Package.json avec scripts complets
- Tailwind configuré (config + CSS de base)
- Composants réutilisables dans src/lib/components/
- Routing SvelteKit multi-pages
- États et interactions JavaScript fonctionnels
- Validation de formulaires si applicable
- Responsive design complet (sm/md/lg/xl)

STRUCTURE ATTENDUE:
- src/routes/+layout.svelte (navigation commune)
- src/routes/+page.svelte (accueil attrayant)
- src/routes/about/+page.svelte, src/routes/contact/+page.svelte (pages secondaires)
- src/lib/components/ (composants UI)
- src/app.css (styles Tailwind + personnalisés)
- tailwind.config.js (configuration couleurs)`,
  applicationStrict: ({ query, maxFiles=20 }) => `Tu es un générateur SvelteKit senior.
Objectif: produire une base IMMÉDIATEMENT compilable pour: "${query}".
Sortie: UNIQUE objet JSON strict.
Règles renforcées:
- Max ${maxFiles} fichiers (priorité routes essentielles + layout + 1-2 composants réutilisables)
- Fichiers obligatoires: package.json, src/routes/+layout.svelte, src/routes/+page.svelte, src/app.css
- package.json minimal: scripts dev/build, dépendances sveltekit + tailwind
- ZÉRO texte hors JSON, ZÉRO commentaires hors code
- Aucune chaîne "TODO" / "FIXME" / placeholder
- Pas de code mort ni variables inutilisées évidentes
- Styles via classes Tailwind exclusivement
- Accessibilité: attributs aria-* pertinents pour navigation / boutons
- Si données mock: mettre dans src/lib/data/*.ts
`
};

export function listPromptTemplates(){
  return Object.keys(promptLibrary);
}

export function buildPrompt(name, params){
  const fn = promptLibrary[name];
  if(!fn) throw new Error('Template inconnu: '+name);
  return fn(params||{});
}

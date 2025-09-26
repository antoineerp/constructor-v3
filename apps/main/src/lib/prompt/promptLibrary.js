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
  applicationBase: ({ query, maxFiles=20 }) => `Génère une application SvelteKit basée sur: "${query}".
Retourne STRICTEMENT un objet JSON { "filename":"CONTENU", ... } (aucun texte hors JSON).
Contraintes:
- Max ${maxFiles} fichiers
- Doit inclure: package.json, src/routes/+page.svelte
- Utiliser Tailwind (si config absente, inclure tailwind.config.cjs, postcss.config.cjs, src/app.css)
- Pas de commentaires verbeux ni markdown
- Pas d'import externe non nécessaire
- Chaque composant Svelte valide (<script> optionnel si purement statique)
- Préférer réutilisation de composants (src/lib/components)
- Pas de placeholder TODO
`,
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

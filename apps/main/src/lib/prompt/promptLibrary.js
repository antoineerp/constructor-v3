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
};

export function listPromptTemplates(){
  return Object.keys(promptLibrary);
}

export function buildPrompt(name, params){
  const fn = promptLibrary[name];
  if(!fn) throw new Error('Template inconnu: '+name);
  return fn(params||{});
}

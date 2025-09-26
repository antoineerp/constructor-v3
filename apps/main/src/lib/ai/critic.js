// Critic pass: construit diagnostics et prompt de corrections ciblées.
import { withJsonEnvelope } from '$lib/ai/jsonExtractor.js';

export function expectedRouteFilesFromBlueprint(blueprint){
  const routes = blueprint?.routes || [];
  const files = routes.map(r => {
    const p = r.path || '/';
    if(p === '/' || p === '') return 'src/routes/+page.svelte';
    const segs = p.split('/').filter(Boolean).map(seg => seg.startsWith(':') ? `[${seg.slice(1)}]` : seg);
    return 'src/routes/' + segs.join('/') + '/+page.svelte';
  });
  return Array.from(new Set(files));
}

export function buildDiagnostics(files, blueprint){
  const diags = { missingRouteFiles: [], missingCoreComponents: [], paletteCoverage: 0, paletteHits: {}, fileCount:Object.keys(files).length };
  const expectedRoutes = expectedRouteFilesFromBlueprint(blueprint);
  diags.missingRouteFiles = expectedRoutes.filter(f => !files[f]);
  const core = (blueprint?.core_components||[]).map(n => n.replace(/[^A-Za-z0-9]/g,''));
  const presentComponents = new Set(Object.keys(files).filter(f => f.startsWith('src/lib/components/') && f.endsWith('.svelte')).map(f => f.split('/').pop().replace('.svelte','')));
  diags.missingCoreComponents = core.filter(c => !presentComponents.has(c));
  const palette = blueprint?.color_palette || [];
  if(palette.length){
    let hits=0;
    const all = Object.values(files).join('\n');
    for(const col of palette){
      const regex = new RegExp(col.replace(/[#]/g,'[#]'),'i');
      if(regex.test(all)){ hits++; diags.paletteHits[col]=true; } else diags.paletteHits[col]=false; }
    diags.paletteCoverage = hits / palette.length;
  }
  return diags;
}

export function shouldTriggerCritic(diags){
  if(!diags) return false;
  if(diags.missingRouteFiles.length) return true;
  if(diags.missingCoreComponents.length) return true;
  if(diags.paletteCoverage < 0.4) return true;
  return false;
}

export function buildCriticPrompt({ blueprint, diagnostics, files }){
  const blueprintSummary = JSON.stringify({
    original_query: blueprint.original_query,
    site_type: blueprint.detected_site_type,
    routes: blueprint.routes?.slice(0,12),
    core_components: blueprint.core_components?.slice(0,20),
    color_palette: blueprint.color_palette?.slice(0,8)
  });
  const diagSummary = JSON.stringify(diagnostics);
  // On limite le nombre de fichiers inclus (uniquement ceux manquants ou à corriger potentiellement) pour économie de tokens
  const targetFilenames = new Set([
    ...diagnostics.missingRouteFiles,
    ...diagnostics.missingCoreComponents.map(c => `src/lib/components/${c}.svelte`)
  ]);
  const contextSnippets = [];
  let budget = 8000;
  for(const [fname, content] of Object.entries(files)){
    if(targetFilenames.has(fname) || fname.endsWith('+layout.svelte') || fname.endsWith('+page.svelte')){
      const snip = content.slice(0, 1000);
      contextSnippets.push(`FILE: ${fname}\n${snip}`);
      budget -= snip.length;
      if(budget <= 0) break;
    }
  }
  const contextBlock = contextSnippets.join('\n\n');
  const instruction = `Analyse le blueprint et les diagnostics.
Si des fichiers manquent ou sont incohérents (palette non appliquée), génère des FICHIERS DE REMPLACEMENT ou DE CREATION minimaux.
Retourne STRICTEMENT un JSON où chaque clé est un nom de fichier et chaque valeur le contenu COMPLET du fichier.
Ne régénère PAS tous les fichiers — uniquement ceux nécessaires (max 6).
Pas de markdown, pas de commentaires hors code.`;
  return withJsonEnvelope(`${instruction}\nBLUEPRINT_SUMMARY:\n${blueprintSummary}\nDIAGNOSTICS:\n${diagSummary}\nEXISTING_SNIPPETS:\n${contextBlock}`);
}

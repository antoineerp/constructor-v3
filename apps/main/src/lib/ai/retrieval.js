// Retrieval vectoriel de composants/code à injecter dans le prompt.
// Utilise semanticSearch sur la table code_snippets (embeddings préalablement upsert).

import { semanticSearch } from '$lib/embeddings';

/**
 * Construit une requête textuelle à partir du blueprint pour la recherche sémantique.
 */
function buildQueryFromBlueprint(blueprint){
  if(!blueprint) return '';
  const parts = [];
  if(blueprint.detected_site_type) parts.push('type:'+blueprint.detected_site_type);
  if(Array.isArray(blueprint.goals)) parts.push('goals:'+blueprint.goals.join(' '));
  if(Array.isArray(blueprint.core_components)) parts.push('components:'+blueprint.core_components.join(' '));
  if(Array.isArray(blueprint.routes)) parts.push('routes:'+ blueprint.routes.map(r=> r.path+':' + (r.sections||[]).join('_')).join(' '));
  if(blueprint.seo_meta?.title) parts.push('title:'+blueprint.seo_meta.title);
  return parts.join(' | ').slice(0, 800);
}

/**
 * buildRetrievalContext
 * @param {object} blueprint
 * @param {object} opts { k, maxInject, maxChars, minScore }
 * @returns {Promise<{contextBlock:string, stats:object}>}
 */
export async function buildRetrievalContext(blueprint, { k=8, maxInject=5, maxChars=500, minScore=0.75 } = {}) {
  const stats = { enabled:false, reason:null, candidates:0, injected:0, threshold:minScore };
  if(!process.env.DATABASE_URL){
    stats.reason = 'DATABASE_URL absente';
    return { contextBlock:'', stats };
  }
  const query = buildQueryFromBlueprint(blueprint);
  if(!query){ stats.reason='query vide'; return { contextBlock:'', stats }; }
  stats.enabled = true;
  let rows = [];
  try {
    rows = await semanticSearch(query, k);
  } catch(e){
    stats.reason = 'semanticSearch erreur: '+e.message;
    return { contextBlock:'', stats };
  }
  stats.candidates = rows.length;
  const filtered = rows.filter(r=> r.path.endsWith('.svelte') && (r.score ?? 0) >= minScore)
    .sort((a,b)=> (b.score||0) - (a.score||0))
    .slice(0, maxInject);
  const blocks = [];
  let totalChars = 0;
  for(const r of filtered){
    let snippet = (r.content||'').trim();
    if(snippet.length > maxChars){ snippet = snippet.slice(0, maxChars) + '\n/* ...tronqué... */'; }
    // Assainir backticks triple qui perturbent parfois le modèle
    snippet = snippet.replace(/```/g,'');
    const block = `/* PATH: ${r.path} | score:${(r.score||0).toFixed(3)} */\n${snippet}`;
    if(totalChars + block.length > 6500){
      break; // stop si trop long pour le contexte prompt
    }
    blocks.push(block);
    totalChars += block.length;
  }
  stats.injected = blocks.length;
  if(!blocks.length){ stats.reason = stats.reason || 'aucun snippet au-dessus du seuil'; }
  const contextBlock = blocks.length
    ? `// === RETRIEVED COMPONENT SNIPPETS (réutiliser par import, ne pas dupliquer) ===\n${blocks.join('\n\n')}\n// === FIN RETRIEVED ===`
    : '';
  return { contextBlock, stats };
}

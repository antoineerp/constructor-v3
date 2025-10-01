// Centralisation des builders de prompts pour génération "premier coup" optimisée
import { detectCapabilities, detectCapabilitiesWithEmbeddings, deriveCapabilityComponents, enrichRoutesWithCapabilities } from '$lib/catalog/capabilities.js';
import { summarizeCatalog } from '$lib/catalog/components.js';

// Génère des design tokens basiques si absents
export function ensureDesignTokens(blueprint){
  if(!blueprint.design_tokens){
    const basePalette = blueprint.color_palette && blueprint.color_palette.length ? blueprint.color_palette : ['#4f46e5','#6366f1','#eef2ff','#1e1b4b','#4338ca'];
    // Variation via style_keywords si présents dans blueprint.intent_expansion
    const style = (blueprint.intent_expansion?.style_keywords||[]).map(s=>s.toLowerCase());
    let derived = [...basePalette];
    if(style.includes('dark')){
      derived = ['#0f172a','#1e293b','#334155','#475569','#6366f1'];
    } else if(style.includes('pastel')){
      derived = ['#f1f5f9','#ffe4e6','#e0f2fe','#ede9fe','#fef9c3'];
    } else if(style.includes('vibrant')){
      derived = ['#6366f1','#ec4899','#10b981','#f59e0b','#0ea5e9'];
    } else if(style.includes('playful')){
      derived = ['#9333ea','#f472b6','#facc15','#34d399','#60a5fa'];
    } else if(style.includes('corporate')){
      derived = ['#1e3a8a','#1e40af','#2563eb','#475569','#e2e8f0'];
    }
    blueprint.design_tokens = {
      colors: derived,
      radii: { sm:'4px', md:'8px', lg:'16px' },
      shadows: { sm:'0 1px 2px rgba(0,0,0,0.05)', md:'0 4px 8px -2px rgba(0,0,0,0.08)', focus:'0 0 0 3px rgba(99,102,241,0.4)' },
      spacingScale: ['4','8','12','16','20','24','32','40']
    };
  }
  return blueprint.design_tokens;
}

// Ajoute un plan layout + usage composants
export function enrichBlueprintStructure(blueprint){
  const routes = blueprint.routes||[];
  const multiple = routes.filter(r=> r.path && r.path !== '/' ).length > 0;
  blueprint.layout_plan = {
    has_layout: multiple,
    shared_sections: multiple ? ['HeaderPro','FooterPro'] : ['HeaderPro']
  };
  return blueprint.layout_plan;
}

export function buildComponentUsagePlan(blueprint, selected){
  const plan = {};
  const routeFiles = routesToFilenames(blueprint.routes||[]);
  for(const comp of selected){
    plan[comp.name] = { filename: comp.filename, used_in: inferDefaultUsage(comp, routeFiles), purpose: comp.purpose };
  }
  blueprint.component_usage_plan = plan;
  return plan;
}

function inferDefaultUsage(comp, routeFiles){
  // heuristique simple selon tags
  if(comp.tags.includes('layout')) return ['src/routes/+layout.svelte'];
  if(comp.tags.includes('hero')) return ['src/routes/+page.svelte'];
  if(comp.tags.includes('article')) return routeFiles.filter(f=> f.includes('articles'));
  if(comp.tags.includes('pricing')) return routeFiles.slice(0,2);
  return [routeFiles[0] || 'src/routes/+page.svelte'];
}

export function routesToFilenames(routes){
  return routes.map(r => {
    const p = r.path || '/';
    if(p === '/' || p === '') return 'src/routes/+page.svelte';
    const segs = p.split('/').filter(Boolean).map(seg => seg.startsWith(':') ? `[${seg.slice(1)}]` : seg);
    return 'src/routes/' + segs.join('/') + '/+page.svelte';
  });
}

export function seedContentIfSparse(blueprint){
  if(!blueprint.sample_content) blueprint.sample_content = {};
  // Articles
  if((blueprint.detected_site_type||'').includes('blog') && (!blueprint.sample_content.articles || blueprint.sample_content.articles.length < 2)){
    blueprint.sample_content.articles = [
      { title: 'Optimiser la performance front', slug:'optimiser-performance', excerpt:'Techniques modernes pour accélérer le rendu et réduire le bundle.', hero_image_prompt:'modern web performance dashboard', body_markdown:'# Performance\nAméliorez le TTFB...' },
      { title: 'Sécuriser une API publique', slug:'securiser-api', excerpt:'Bonnes pratiques clés pour APIs REST et GraphQL.', hero_image_prompt:'security lock api diagram', body_markdown:'# Sécurité\nChecklist OWASP...' }
    ];
  }
  // Produits / pricing
  if((blueprint.detected_site_type||'').includes('ecommerce') && !blueprint.sample_content.products){
    blueprint.sample_content.products = [
      { name:'Pack Starter', price:19, sku:'START-19', description:'Entrée de gamme pour débuter.' },
      { name:'Pack Pro', price:49, sku:'PRO-49', description:'Fonctionnalités avancées.' }
    ];
  }
  // Invoices
  if(/factur|invoice|billing/i.test(JSON.stringify(blueprint)) && !blueprint.sample_content.invoices){
    blueprint.sample_content.invoices = [ { id:'INV-001', client:'Acme', total:1200 }, { id:'INV-002', client:'Globex', total:560 } ];
  }
  return blueprint.sample_content;
}

export async function buildGlobalGenerationPromptAsync(blueprint, selected, { generationProfile = 'safe' } = {}){
  let capHits = [];
  try { capHits = await detectCapabilitiesWithEmbeddings(blueprint); } catch(e){ capHits = detectCapabilities(blueprint); }
  if(capHits.length){
    enrichRoutesWithCapabilities(blueprint, capHits);
    const compFromCaps = deriveCapabilityComponents(capHits);
    blueprint.core_components = Array.from(new Set([...(blueprint.core_components||[]), ...compFromCaps]));
  }
  seedContentIfSparse(blueprint);
  const differentiators = [];
  if(capHits.find(h=> h.id==='invoicing')) differentiators.push('Doit inclure pages factures list + édition avec montants formatés.');
  if(capHits.find(h=> h.id==='i18n')) differentiators.push('Structurer pour switch langue (utilise LanguageSwitcher).');
  if((blueprint.color_palette||[]).length >= 2) differentiators.push('Palette cohérente réutilisée (pas de nouvelles couleurs).');
  if(capHits.find(h=> h.id==='dashboard')) differentiators.push('Tableau de bord avec cartes KPI + table triable.');
  const tokens = ensureDesignTokens(blueprint);
  const layoutPlan = enrichBlueprintStructure(blueprint);
  const usage = buildComponentUsagePlan(blueprint, selected);
  const catalogSummary = summarizeCatalog(1400);
  const routeFiles = routesToFilenames(blueprint.routes||[]);
  const required = new Set(routeFiles);
  if(layoutPlan.has_layout) required.add('src/routes/+layout.svelte');
  Object.values(usage).forEach(u => required.add(u.filename));
  const requiredList = Array.from(required).slice(0,25);
  const availableComponentsMeta = selected.map(c => `${c.name} :: ${c.filename} :: ${c.purpose}`).join('\n');
  const modeBlock = generationProfile === 'external_libs'
    ? 'MODE: external_libs (chart.js et @tanstack/table-core AUTORISÉS si réellement utilisés).'
    : generationProfile === 'enhanced'
      ? 'MODE: enhanced (structure optimisée, réutilisation agressive composants, AUCUNE dépendance externe).'
      : 'MODE: safe (sortie minimalement nécessaire, aucune dépendance externe).';

  return { prompt: `SYSTEM:
Tu es un architecte Senior SvelteKit spécialisé en Skeleton UI. Objectif: produire TOUT le squelette d'application de haute qualité en une seule passe.

🎨 UI FRAMEWORK: Utilise OBLIGATOIREMENT Skeleton UI (@skeletonlabs/skeleton) pour TOUS les composants.
- Import: import { AppBar, Card, Modal, Button, etc } from '@skeletonlabs/skeleton';
- Classes: variant-filled, variant-soft, variant-ghost, btn, card, etc.
- Thème: theme-skeleton.css (préchargé)
- Documentation: https://skeleton.dev

${modeBlock}
CAPABILITIES DETECTÉES: ${capHits.map(h=> h.id+':'+h.score.toFixed(2)+(h.similarity?'/sim:'+h.similarity.toFixed(2):'')).join(', ') || 'aucune'}

DIFFERENTIATION:
${differentiators.map(d=>' - '+d).join('\n') || ' - Fournir une identité claire via ton concis et structuration soignée.'}

GLOBAL BLUEPRINT CONTEXT (résumé JSON compressé):\n${JSON.stringify({
  site_type: blueprint.detected_site_type,
  goals: blueprint.goals,
  seo: blueprint.seo_meta,
  routes: blueprint.routes,
  core_components: blueprint.core_components,
  capabilities: capHits.map(h=> h.id),
  sample: Object.keys(blueprint.sample_content||{})
}).slice(0,1400)}

DESIGN TOKENS (immutables, réutilise-les):\n${JSON.stringify(tokens)}

LAYOUT PLAN: ${JSON.stringify(layoutPlan)}

AVAILABLE COMPONENTS (NE PAS RÉÉCRIRE, juste importer si utile):\n${availableComponentsMeta}

COMPONENT USAGE PLAN (suggestions, respecter si pertinent):\n${JSON.stringify(usage).slice(0,1400)}

REQUIRED FILES (prioritaires):\n${requiredList.join('\n')}

RULES (ordre de priorité):
1. Sortie = UNIQUE objet JSON clés=fichiers valeurs=contenu brut.
2. AUCUN texte hors JSON. AUCUNE explication, pas de markdown fences.
3. Ne réécris pas un composant listé.
4. Si has_layout=true fournir src/routes/+layout.svelte avec slot + imports nécessaires.
5. Max ${requiredList.length + 5} fichiers.
6. Accessibilité: un <h1> par page, alt sur chaque <img>.
7. ${generationProfile === 'external_libs' ? 'Seules dépendances externes permises: chart.js, @tanstack/table-core (inclure package.json si utilisées) sinon aucune.' : 'Pas de dépendances externes.'} Données = mocks locaux sample_content.
8. Tailwind uniquement; réutiliser palette existante.
9. Fichiers Svelte valides; pas de duplication markup composants.
10. Adapter contenu aux capabilities détectées.
11. Utiliser design tokens fournis; pour couleurs custom non palette préférer variables existantes.

CONTENT TONE: moderne, professionnel, clair.

OUTPUT FORMAT STRICT: { "filename":"CONTENU" , ... }

GENÈRE maintenant tous les fichiers nécessaires.`, capabilities: capHits };
}

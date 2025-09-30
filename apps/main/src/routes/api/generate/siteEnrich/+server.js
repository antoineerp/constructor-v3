import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';

/* Phase 2 – Enrichissement d'un site généré (amélioration structure, sections, a11y, CTA internes)
Request: { spec, files, target? }
 - spec: spec JSON d'origine (Phase 1)
 - files: objet { 'Router.svelte': '...', 'pages/Home.svelte': '...', ... } (minimum pages/*.svelte + Router)
 - target (optionnel): { minSectionsPerPage, minScore }
Response: { success, spec, updatedFiles, richness, changedPages, passes }
*/
export async function POST(event){
  try {
    const body = await event.request.json();
    const { spec, files = {}, target = {} } = body || {};
    if(!spec || !spec.pages) return json({ success:false, error:'spec manquante' }, { status:400 });
    if(!openaiService.apiKey){
      // Fallback offline: ajouter une section hero-extra à chaque page manquante
      for(const p of spec.pages){
        const hasExtra = (p.sections||[]).some(s=> s.type==='extra');
        if(!hasExtra){
          p.sections = p.sections || []; p.sections.push({ type:'content', heading:'Section enrichie offline', text:'(mode dégradé)' });
        }
      }
      const richness = richnessScore(spec);
      return json({ success:true, spec, updatedFiles:{}, richness, changedPages:[], passes:[{stage:'offline'}] });
    }

    const passes = [];

    const originalSpec = JSON.parse(JSON.stringify(spec));
    const minSectionsPerPage = target.minSectionsPerPage || 6;
    const desiredScore = target.minScore || 140; // heuristique

    function richnessScore(s){
      const pages = s.pages.length;
      let sections=0, images=0, nav=(s.navigation||[]).length;
      for(const p of s.pages){ sections += (p.sections||[]).length; for(const sec of (p.sections||[])){ if(sec.image) images++; if(Array.isArray(sec.images)) images += sec.images.length; } }
      const score = pages*8 + sections*2 + images*1.5 + nav*2;
      return { score: Math.round(score), metrics:{ pages, sections, images, navItems: nav } };
    }

    const currentRichness = richnessScore(spec);

    // Déterminer déficits
    const sectionTypesTarget = ['hero','features','testimonials','pricing','cta','content','gallery','faq','footer'];
    const deficits = [];
    // Manque de sections par page
    for(const p of spec.pages){
      const count = (p.sections||[]).length;
      if(count < minSectionsPerPage) deficits.push(`Page ${p.slug} seulement ${count} sections (<${minSectionsPerPage})`);
      const haveTypes = new Set((p.sections||[]).map(s=> s.type));
      for(const t of sectionTypesTarget){
        if(!haveTypes.has(t)) deficits.push(`Page ${p.slug} manque section type ${t}`);
      }
    }
    // Images sans alt
    for(const p of spec.pages){
      for(const s of (p.sections||[])){
        if(s.image && !s.image.alt) deficits.push(`Image ${s.image.id||'sans-id'} sans alt (page ${p.slug})`);
      }
    }
    // Page contact / form
    if(!spec.pages.some(p=> /contact|support|form/.test(p.slug))) deficits.push('Aucune page contact/support/form');

    // Si déjà suffisant
    if(currentRichness.score >= desiredScore && !deficits.length){
      return json({ success:true, spec, updatedFiles:{}, richness: currentRichness, changedPages:[], passes:[{stage:'skip', reason:'déjà suffisant'}] });
    }

    // PASS 1: enrichir spec
    const enrichSpecPrompt = `Tu es un assistant d'enrichissement de structure de site.
Reçois un JSON spec existant et une liste de déficits.
Objectif: produire une NOUVELLE spec JSON enrichie (même schéma) corrigeant les déficits, en respectant:
- Chaque page >= ${minSectionsPerPage} sections;
- Ajouter SEULEMENT des sections pertinentes (pas de répétitions abusives);
- Couvrir les types manquants (${sectionTypesTarget.join(', ')});
- S'assurer que chaque image possède un alt descriptif concis;
- Ajouter une page contact si absente (slug contact) avec formulaire simple (section type content + section type faq si logique) et CTA vers pricing ou home;
- Maintenir cohérence navigation (ajouter liens pages nouvelles);
- Ajouter CTAs transverses (ex: hero -> pricing, pricing -> contact);
Retourne UNIQUEMENT le JSON spec complet (pas de markdown, pas d'autres champs).
Spec actuelle:
${JSON.stringify(spec)}
Déficits:
${deficits.join('\n')}`;
    const specRaw = await openaiService.generateComponent(enrichSpecPrompt, 'spec-enrich', { model:'gpt-4o-mini' });
    passes.push({ stage:'spec-enrich', size: specRaw?.length||0 });
    let newSpec; try { newSpec = JSON.parse(specRaw); } catch { return json({ success:false, error:'JSON spec enrich invalide', raw:specRaw }, { status:422 }); }
    if(!newSpec.pages || !Array.isArray(newSpec.pages) || !newSpec.pages.length){
      return json({ success:false, error:'Spec enrichie invalide (pages)' }, { status:422, raw: specRaw });
    }

    // PASS 2: déterminer pages modifiées
    function pageMap(s){ const m=new Map(); for(const p of s.pages) m.set(p.slug,p); return m; }
    const oldMap = pageMap(originalSpec); const newMap = pageMap(newSpec);
    const changedPages = [];
    for(const [slug, np] of newMap.entries()){
      const op = oldMap.get(slug);
      if(!op){ changedPages.push(slug); continue; }
      const oldTypes = (op.sections||[]).map(s=> s.type).join(',');
      const newTypes = (np.sections||[]).map(s=> s.type).join(',');
      if(oldTypes !== newTypes || (op.sections||[]).length !== (np.sections||[]).length){ changedPages.push(slug); }
    }

    // Préparer code source original des pages modifiées
    const originalPageCodes = {};
    for(const slug of changedPages){
      const pascal = slug.replace(/(^.|-.)/g, s=> s.replace('-','').toUpperCase());
      const filename = `pages/${pascal}.svelte`;
      if(files[filename]){
        // tronquer pour éviter prompts trop longs
        originalPageCodes[filename] = files[filename].slice(0, 6000);
      }
    }
    const routerCode = files['Router.svelte'] ? files['Router.svelte'].slice(0,8000) : '';

    const codePrompt = `Tu reçois:
- Ancienne spec (A)
- Nouvelle spec enrichie (B)
- Liste de pages à (re)générer (changedPages)
- Code original actuel pour ces pages
Tâche: générer SEULEMENT les fichiers complets mis à jour pour les pages indiquées ET Router.svelte si nécessaire (navigation / liens / CTAs). Ne renvoie pas les pages inchangées.
Contraintes:
- Svelte valide, Tailwind utilitaire, pas de dépendances externes.
- Images format <img src=... alt=... loading="lazy" /> (utiliser https://placehold.co/600x400?text=ID si besoin).
- Ajouter dans chaque page au moins un CTA interne (<a href="#" ... on:click|preventDefault={()=> navigate('slug')}>), supposer fonction navigate(slug) exposée dans Router si besoin.
Format sortie STRICT: JSON { "files": { "pages/Home.svelte":"...", "Router.svelte":"..." } }
Ancienne spec (A):
${JSON.stringify(spec)}
Nouvelle spec (B):
${JSON.stringify(newSpec)}
changedPages: ${JSON.stringify(changedPages)}
Code original pages:
${Object.entries(originalPageCodes).map(([k,v])=>`FILE:${k}\n${v}`).join('\n---\n')}
${routerCode? `Code Router actuel:\n${routerCode}`:''}`;

    const filesRaw = changedPages.length ? await openaiService.generateComponent(codePrompt, 'code-enrich', { model:'gpt-4o-mini' }) : '{"files":{}}';
    passes.push({ stage:'code-enrich', size: filesRaw?.length||0, changed: changedPages.length });
    let updated; try { updated = JSON.parse(filesRaw); } catch { return json({ success:false, error:'JSON code enrich invalide', raw: filesRaw }, { status:422 }); }
    const updatedFiles = updated.files || {};

    const finalRichness = richnessScore(newSpec);
    return json({ success:true, spec: newSpec, updatedFiles, richness: finalRichness, changedPages, passes, deficits, previousRichness: currentRichness });
  } catch(e){
    console.error('siteEnrich error', e);
    return json({ success:false, error:e.message||'Erreur enrichissement' }, { status:500 });
  }
}

import { json } from '@sveltejs/kit';
import { openaiService } from '$lib/openaiService.js';

/* Phase 1 – Génération multipages en 2 passes : spec JSON puis code.
Request: { prompt:string, targetPages?:number }
Response: { success, spec, files, richness, passes }
*/
export async function POST(event){
  const { request } = event;
  try {
    const body = await request.json();
    const { prompt, targetPages = 4 } = body||{};
    if(!prompt || !prompt.trim()) return json({ success:false, error:'prompt requis' }, { status:400 });
    if(!openaiService.apiKey) return json({ success:false, error:'Clé OpenAI absente' }, { status:500 });

    const passMeta = [];
    // Pass 1: SPEC JSON stricte
    const specPrompt = `Tu agis comme un architecte de site web.
Réponds UNIQUEMENT avec un JSON valide (pas de markdown) décrivant un site riche.
Contraintes fortes:
- pages: au moins ${targetPages} pages (home obligatoire) avec slug, title.
- Chaque page >= 4 sections.
- Chaque section a un type dans [hero, features, testimonials, pricing, cta, content, gallery, footer, faq].
- Ajoute images pertinentes (id, alt) par section (>=2 par page si possible).
- navigation: liste d'objets { label, slug } couvrant toutes les pages.
- theme: primaryColor, accentColor, font.
Schéma:
{ "pages": [ { "slug":"home", "title":"...", "sections":[ { "type":"hero", "heading":"...", "text":"...", "image?": {"id":"hero1","alt":"..."}, "bullets?": ["..."], "cta?": {"label":"...","target":"pricing"} } ] } ], "navigation":[ {"label":"Accueil","slug":"home"} ], "assets": [ {"id":"hero1","purpose":"hero","alt":"..."} ], "theme": {"primaryColor":"#...","accentColor":"#...","font":"Inter"} }
Important: slugs kebab-case, pas d'autres champs.
Prompt utilisateur: ${prompt}`;
    const specRaw = await openaiService.generateComponent(specPrompt, 'spec', { model:'gpt-4o-mini' });
    passMeta.push({ stage:'spec', size: specRaw?.length||0 });
    let spec; try { spec = JSON.parse(specRaw); } catch { return json({ success:false, error:'JSON spec invalide', raw: specRaw }, { status:422 }); }
    // Validation minimale
    if(!spec.pages || !Array.isArray(spec.pages) || !spec.pages.length){ return json({ success:false, error:'Spec sans pages' }, { status:422, spec }); }

    // Scoring pré-code
    function richnessScore(s){
      const pages = s.pages.length;
      let sections=0, images=0, nav=(s.navigation||[]).length;
      for(const p of s.pages){ sections += (p.sections||[]).length; for(const sec of (p.sections||[])){ if(sec.image) images++; if(Array.isArray(sec.images)) images += sec.images.length; } }
      const score = pages*8 + sections*2 + images*1.5 + nav*2;
      return { score: Math.round(score), metrics:{ pages, sections, images, navItems: nav } };
    }
    let richness = richnessScore(spec);

    // Pass 2: génération code multipage
    const codePrompt = `Convertis la spec JSON suivante en fichiers Svelte multipages.
Exigences:
- Un fichier Router.svelte qui gère la navigation (état currentPage, nav). Pas de dépendances externes autres que Svelte.
- Chaque page devient pages/Slug.svelte (Slug = PascalCase du slug).
- Utilise Tailwind utility classes.
- Chaque image => <img src=\"https://placehold.co/600x400?text=${'${id}'}\" alt=\"ALT\" loading=\"lazy\" /> (remplace ALT par alt de l'asset).
- Inclure un composant Navigation interne dans Router.svelte.
- Aucune explication hors du code. Fournis un objet JSON: { files: { "Router.svelte":"...", "pages/Home.svelte":"..." } }
Spec:
${JSON.stringify(spec)}
`; 
    const filesRaw = await openaiService.generateComponent(codePrompt, 'code-gen', { model:'gpt-4o-mini' });
    passMeta.push({ stage:'code-gen', size: filesRaw?.length||0 });
    let filesJson; try { filesJson = JSON.parse(filesRaw); } catch { return json({ success:false, error:'JSON fichiers invalide', raw: filesRaw, spec, richness }, { status:422 }); }
    const files = filesJson.files || {};
    // Post enrichissement minimal: vérifier Router
    if(!files['Router.svelte']){
      // Générer Router basique si absent
      const nav = (spec.navigation||[]).map(n=> `<a href='#' on:click|preventDefault={()=> current='${n.slug}'} class='px-2 py-1 rounded hover:bg-gray-100'>{current==='${n.slug}'?'<strong>${n.label}</strong>':'${n.label}'}</a>`).join('\n      ');
      const imports = spec.pages.map(p=> `import ${p.slug.replace(/(^.|-.)/g,s=> s.replace('-','').toUpperCase())} from './pages/${p.slug.replace(/(^.|-.)/g,s=> s.replace('-','').toUpperCase())}.svelte';`).join('\n');
      const mapping = spec.pages.map(p=> `'${p.slug}': ${p.slug.replace(/(^.|-.)/g,s=> s.replace('-','').toUpperCase())}`).join(', ');
      files['Router.svelte'] = `<script>\n${imports}\nlet current='${spec.pages[0].slug}';\nconst pages={${mapping}};\n</script>\n<nav class='flex gap-2 text-sm mb-4 border-b pb-2'>\n  ${nav}\n</nav>\n<svelte:component this={pages[current]} />`;
    }
    // Score final (peut évoluer si on parse les fichiers pour compter images réelles plus tard)
    const result = { success:true, spec, files, richness, passes: passMeta };
    return json(result);
  } catch(e){
    console.error('site2pass error', e);
    return json({ success:false, error:e.message||'Erreur génération site2pass' }, { status:500 });
  }
}

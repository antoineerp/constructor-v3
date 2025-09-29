import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Endpoint: /api/preview
// Query params: projectId (obligatoire), file (optionnel)
// Retour: HTML sandboxé (Content-Type text/html) encapsulant le fichier +page.svelte (ou file sélectionné) transformé naïvement en "HTML statique".
// NOTE: Ceci est un sandbox très simplifié: on retire les <script> et on ne résout pas les imports Svelte.
// Objectif: aperçu rapide du markup généré sans build complet.

export async function GET({ url, request }) {
  try {
    const projectId = url.searchParams.get('projectId');
  const file = url.searchParams.get('file');
  const routeParam = url.searchParams.get('route');
    if (!projectId) return json({ error: 'projectId requis' }, { status: 400 });

    // Auth facultative: si header Authorization présent on le propage pour respecter RLS
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, authHeader ? { global: { headers: { Authorization: authHeader } } } : {});

    // Récupérer fichiers du projet (table project_files de préférence sinon fallback code_generated)
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (pErr) throw pErr;

    // Essayer project_files
    const { data: files, error: fErr } = await supabase.from('project_files').select('filename, content').eq('project_id', projectId).limit(50);
    if (fErr) {
      console.warn('project_files indisponible, fallback code_generated');
    }
    let mapping = {};
    if (files && files.length) {
      for (const f of files) mapping[f.filename] = f.content;
    } else {
      mapping = project.code_generated || {};
    }

    // Détecter fichiers de pages +page.svelte
    const pageFiles = Object.keys(mapping).filter(k => /src\/routes\/.+\+page\.svelte$|src\/routes\/\+page\.svelte$/.test(k));
    // Map route -> fichier
    const routeMap = pageFiles.reduce((acc,f)=>{
      const rel = f.replace(/^src\/routes\//,'');
      let routePath = '/' + rel.replace(/\+page\.svelte$/,'').replace(/index\.svelte$/,'').replace(/\/\+page\.svelte$/,'');
      routePath = routePath.replace(/\/$/,'');
      if(routePath==='') routePath='/';
      // transformer [slug] -> :slug pour affichage
      routePath = routePath.replace(/\[(.+?)\]/g, ':$1');
      acc[routePath] = f; return acc;
    }, {});

    let chosenRoute = null;
    if(routeParam && routeMap[routeParam]) {
      chosenRoute = routeParam;
    }

    // Choisir fichier principal
    const mainCandidates = file ? [file] : [ chosenRoute ? routeMap[chosenRoute] : null, 'src/routes/+page.svelte', 'src/routes/index.svelte' ].filter(Boolean);
    let chosen = null;
    for (const c of mainCandidates) { if (mapping[c]) { chosen = c; break; } }
    if (!chosen) {
      const first = Object.keys(mapping)[0];
      if (!first) return json({ error: 'Aucun fichier pour ce projet' }, { status: 404 });
      chosen = first;
    }

    let raw = mapping[chosen] || '';
    // Sanitize: retirer scripts
    raw = raw.replace(/<script[\s\S]*?<\/script>/gi, '');
    // Réécriture des liens internes absolus pour rester dans le sandbox
    // On réécrit href="/xxx" en href="?projectId=...&route=/xxx"
    const internalRouteRegex = /href=("|')\/(?!\/)([^"'#? ]+[^"'# ]?)("|')/g;
    raw = raw.replace(internalRouteRegex, (m, q1, path, q3) => {
      const cleaned = '/' + path.replace(/\/$/, '');
      return `href="?projectId=${encodeURIComponent(projectId)}&route=${encodeURIComponent(cleaned)}"`;
    });
    // Ajout d'une classe sur <a> non réécrits internes relatifs potentiels
    raw = raw.replace(/<a /g, '<a class="preview-link" ');
    // Heuristique: si composant Svelte contient {#each} etc., on laisse tel quel (pas d'exécution) → afficher comme code.
    const isLikelySvelte = /{#each|{#if|on:click=/.test(raw);

  const routesList = Object.keys(routeMap).sort((a,b)=> a.localeCompare(b));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Aperçu Sandbox</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
<script src="https://cdn.tailwindcss.com"></script>
<style>body{font-family:system-ui, sans-serif;padding:1rem;background:#f1f5f9;} .container{max-width:1100px;margin:0 auto;} pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:.5rem;overflow:auto;font-size:.8rem;} .routes{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem} .routes a{font-size:.7rem;padding:.3rem .55rem;border:1px solid #cbd5e1;border-radius:.4rem;background:#fff;text-decoration:none;color:#334155} .routes a.active{background:#6366f1;color:#fff;border-color:#6366f1} .routes a:hover{border-color:#6366f1}</style>
</head><body><div class="container">
<div class="routes">
${routesList.map(r=> `<a href="?projectId=${encodeURIComponent(projectId)}&route=${encodeURIComponent(r)}" class="${r === chosenRoute ? 'active':''}">${r}</a>`).join('')}
</div>
<h1 class="text-sm font-semibold mb-3 text-slate-700">Fichier: <code>${chosen}</code></h1>
${ isLikelySvelte ? `<div class="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded">Syntaxe Svelte détectée – rendu statique (code affiché).</div><pre>${escapeHtml(raw)}</pre>` : raw }
<script>
// Interception navigation pour rester dans le sandbox quand param route manquant
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a');
  if(!a) return;
  if(a.getAttribute('href') && a.getAttribute('href').startsWith('?projectId=')) return; // déjà réécrit
  if(a.getAttribute('href') && a.getAttribute('href').startsWith('/')){
    e.preventDefault();
    const target = a.getAttribute('href').replace(/#.*$/,'');
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', '${projectId}');
    url.searchParams.set('route', target);
    window.location.href = url.toString();
  }
});
</script>
</div></body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    console.error('preview error', e);
    return json({ error: e.message }, { status: 500 });
  }
}

function escapeHtml(str){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

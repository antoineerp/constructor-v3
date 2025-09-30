import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

import { computeFileHash, getCached, setCached } from '$lib/preview/compileCache.js';
import { supabase as clientSupabase, isSupabaseEnabled } from '$lib/supabase.js';

// GET /api/projects/:id/preview
// Retourne un rendu SSR HTML du fichier d'entrée (src/routes/+page.svelte) du code généré.
// Objectif: fournir un aperçu rapide avec Tailwind (classes présentes) sans hydrater pour l'instant.
export async function GET(event){
  const { params, url, locals } = event;
  const projectId = params.id;
  const fileParam = url.searchParams.get('file');
  if(!projectId) return json({ success:false, error:'projectId manquant' }, { status:400 });
  try {
    // Récupération projet
    let files;
    if(isSupabaseEnabled){
      const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
      if(locals.user?.id) queryBuilder.eq('user_id', locals.user.id);
      const { data: project, error } = await queryBuilder.single();
      if(error) throw error;
      if(!project?.code_generated){
        return json({ success:false, error:'Aucun code généré pour ce projet' }, { status:404 });
      }
      files = project.code_generated;
    } else {
      files = {
        'src/routes/+page.svelte': `<h1 class="text-2xl font-bold text-indigo-600">Demo Offline</h1><p class="text-sm text-gray-600">Preview SSR sans Supabase.</p>`,
        'src/routes/blog/+page.svelte': `<h2 class="text-xl font-semibold text-purple-600">Blog</h2><p class="text-xs text-gray-500">Page blog fallback (offline).</p>`
      };
    }
    // Filtrer seulement les routes .svelte (heuristique)
    const svelteFiles = Object.keys(files).filter(f=> f.endsWith('.svelte'));
    if(!svelteFiles.length) return json({ success:false, error:'Aucun fichier Svelte présent' }, { status:404 });
    // Liste des routes probables: chemins sous src/routes
    const routeCandidates = svelteFiles.filter(f=> f.startsWith('src/routes/'));
    let entry = fileParam && files[fileParam] ? fileParam : 'src/routes/+page.svelte';
    if(!files[entry]) entry = routeCandidates.find(r=> /\+page\.svelte$/.test(r)) || svelteFiles[0];
    const source = files[entry];
    const cacheKey = computeFileHash(entry, source, { variant:'ssr-html' });
    const cached = getCached(cacheKey);
    // Inject quality meta (dernière génération)
    let quality = null; let validation_summary = null;
    try {
      const { data: logs } = await clientSupabase.from('generation_logs')
        .select('meta')
        .eq('project_id', projectId)
        .order('created_at', { ascending:false })
        .limit(1);
      if(logs && logs.length){
        quality = logs[0].meta?.quality || null;
        validation_summary = logs[0].meta?.validation_summary || null;
      }
    } catch(_e){ /* ignore */ }
    if(cached){
      return json({ success:true, entry, html: cached.html, fileCount: svelteFiles.length, routes: routeCandidates, cached:true, quality, validation_summary });
    }
    let html = '';
    try {
      const c = compile(source, { generate:'ssr', css:'external', filename: entry, runes: false, compatibility: { componentApi: 4 } });
      const fn = new Function('require','module','exports', c.js.code);
      const mod = { exports: {} };
      fn((n)=> (n==='svelte/internal'? require('svelte/internal'): require(n)), mod, mod.exports);
      const Comp = mod.exports.default || mod.exports;
      if(Comp?.render){
        const rendered = Comp.render({});
        html = rendered.html || '';
      } else {
        html = '<!-- render() manquant -->';
      }
    } catch(e){
      return json({ success:false, error:'Compilation SSR échouée: '+e.message }, { status:500 });
    }
    // Extra: injecter un wrapper pour visualisation isolée
    const wrapped = `<div class="preview-root">${html}</div>`;
  setCached(cacheKey, { html: wrapped }, 60*1000); // 60s cache SSR
  return json({ success:true, entry, html: wrapped, fileCount: svelteFiles.length, routes: routeCandidates, cached:false, quality, validation_summary });
  } catch(e){
    return json({ success:false, error: e.message }, { status:500 });
  }
}

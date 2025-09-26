import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { supabase as clientSupabase } from '$lib/supabase.js';

// GET /api/projects/:id/preview
// Retourne un rendu SSR HTML du fichier d'entrée (src/routes/+page.svelte) du code généré.
// Objectif: fournir un aperçu rapide avec Tailwind (classes présentes) sans hydrater pour l'instant.
export async function GET(event){
  const { params, url, locals } = event;
  const projectId = params.id;
  if(!projectId) return json({ success:false, error:'projectId manquant' }, { status:400 });
  try {
    // Récupération projet
    const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
    if(locals.user?.id) queryBuilder.eq('user_id', locals.user.id);
    const { data: project, error } = await queryBuilder.single();
    if(error) throw error;
    if(!project?.code_generated){
      return json({ success:false, error:'Aucun code généré pour ce projet' }, { status:404 });
    }
    const files = project.code_generated;
    // Sélection du fichier d'entrée
    let entry = 'src/routes/+page.svelte';
    if(!files[entry]){
      const firstSvelte = Object.keys(files).find(f=> f.endsWith('.svelte'));
      if(!firstSvelte){
        return json({ success:false, error:'Aucun fichier Svelte présent' }, { status:404 });
      }
      entry = firstSvelte;
    }
    const source = files[entry];
    let html = '';
    try {
      const c = compile(source, { generate:'ssr', css:false, filename: entry });
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
    return json({ success:true, entry, html: wrapped, fileCount: Object.keys(files).length });
  } catch(e){
    return json({ success:false, error: e.message }, { status:500 });
  }
}

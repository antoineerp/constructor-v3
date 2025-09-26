import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { supabase as clientSupabase } from '$lib/supabase.js';
import { computeProjectHash, getCached, setCached } from '$lib/preview/compileCache.js';

// POST /api/projects/:id/compile
// Body optionnel: { entries?: string[], files?: Record<string,string> } (si files absent => charge depuis DB)
// Retour: { modules:[{path, jsCode, css?}], entry, cached, timings }
export async function POST(event){
  const t0 = Date.now();
  const { params, request, locals } = event;
  const projectId = params.id;
  if(!projectId) return json({ success:false, error:'projectId manquant' }, { status:400 });
  let body = {};
  try { body = await request.json(); } catch(_e) {}
  const { entries = [], files: injectedFiles } = body;
  try {
    let projectFiles = injectedFiles;
    if(!projectFiles){
      const qb = clientSupabase.from('projects').select('*').eq('id', projectId);
      if(locals.user?.id) qb.eq('user_id', locals.user.id);
      const { data: project, error } = await qb.single();
      if(error) throw error;
      if(!project?.code_generated) return json({ success:false, error:'Aucun code généré' }, { status:404 });
      projectFiles = project.code_generated;
    }
    // Filtrer uniquement fichiers Svelte + JS potentiels
    const svelteEntries = Object.entries(projectFiles).filter(([k])=> k.endsWith('.svelte'));
    if(!svelteEntries.length) return json({ success:false, error:'Aucun fichier Svelte' }, { status:404 });
    let entry = entries.find(e=> projectFiles[e]) || 'src/routes/+page.svelte';
    if(!projectFiles[entry]) entry = svelteEntries[0][0];
    const hash = computeProjectHash(projectFiles, { entry, variant:'dom-esm' });
    const cached = getCached(hash);
    if(cached){
      return json({ success:true, cached:true, ...cached });
    }
    const modules = [];
    for(const [path, source] of svelteEntries){
      try {
        const c = compile(source, { generate:'dom', format:'esm', filename: path, css:true });
        let jsCode = c.js.code;
        // Inline CSS si présent (simple concat) — amélioration future: module séparé
        if(c.css && c.css.code){
          jsCode = `/* <style> inlined */\n` + jsCode + `\n/*# sourceMappingURL omitted */`;
        }
        modules.push({ path, jsCode });
      } catch(e){
        modules.push({ path, error: e.message });
      }
    }
    const result = { modules, entry, cached:false, timings:{ total_ms: Date.now()-t0 } };
    setCached(hash, result, 2*60*1000); // 2 min
    return json({ success:true, ...result });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

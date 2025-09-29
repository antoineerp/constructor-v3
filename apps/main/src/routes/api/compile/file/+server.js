import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';


// GET /api/compile/file?projectId=..&filename=..
// Retourne HTML SSR du fichier .svelte stocké (projects/project_files)
export async function GET({ url, request }) {
  try {
    const projectId = url.searchParams.get('projectId');
    const filename = url.searchParams.get('filename');
    if(!projectId || !filename) return json({ success:false, error:'projectId & filename requis' }, { status:400 });
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  // Supabase retiré
    // Chercher d'abord project_files
    let code = '';
    const { data:pf, error:pfErr } = await client.from('project_files').select('content').eq('project_id', projectId).eq('filename', filename).maybeSingle();
    if(pfErr){ console.warn('project_files indisponible', pfErr.message); }
    if(pf?.content) code = pf.content;
    if(!code){
      const { data:proj, error:pErr } = await client.from('projects').select('code_generated').eq('id', projectId).single();
      if(pErr) throw pErr;
      code = proj?.code_generated?.[filename] || '';
    }
    if(!code) return json({ success:false, error:'Fichier introuvable dans le projet' }, { status:404 });
    if(!filename.endsWith('.svelte')) return json({ success:false, error:'Seuls les fichiers .svelte sont compilables' }, { status:400 });

    let compiled;
    try { compiled = compile(code, { generate:'ssr', css:'external' }); } catch(e){ return json({ success:false, error:'Erreur compilation: '+e.message }, { status:400 }); }
    let Component;
    try {
      const fn = new Function('require','module','exports', compiled.js.code);
      const mod = { exports: {} };
      fn((n)=> (n==='svelte/internal'? require('svelte/internal'): require(n)), mod, mod.exports);
      Component = mod.exports.default || mod.exports;
      if(!Component?.render) throw new Error('render() absent');
    } catch(e){ return json({ success:false, error:'Évaluation impossible: '+e.message }, { status:500 }); }
    let rendered;
    try { rendered = Component.render({}); } catch(e){ return json({ success:false, error:'Rendu échoué: '+e.message }, { status:500 }); }
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><script src="https://cdn.tailwindcss.com"></script></head><body class='p-4'>${rendered.html}</body></html>`;
    return new Response(html, { headers:{ 'Content-Type':'text/html; charset=utf-8' } });
  } catch(e){
    console.error('compile/file error', e);
    return json({ success:false, error: e.message }, { status:500 });
  }
}
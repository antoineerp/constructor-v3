import { json } from '@sveltejs/kit';
import { POST as compileSingle } from '../component/+server.js';

// Endpoint expérimental: compile plusieurs pages Svelte indépendantes et retourne un manifest { path: html }.
// Body: { pages:[ { path:string, code:string, dependencies?:{[k:string]:string} } ], strict?:boolean, debug?:boolean }
export async function POST(event){
  try {
    const body = await event.request.json();
    const { pages = [], strict=false, debug=false } = body || {};
    if(!Array.isArray(pages) || !pages.length) return json({ success:false, error:'pages[] requis' }, { status:400 });
    const results = {};
    const meta = [];
    for(const p of pages){
      if(!p || !p.code || !p.path){
        meta.push({ path: p?.path || '(invalide)', error:'Entrée page invalide' });
        continue;
      }
      try {
        // On réutilise la logique du composant en forgeant une requête isolée.
        const payload = { code: p.code, dependencies: p.dependencies||{}, strict, debug };
        const res = await fetch('http://localhost'+ '/api/compile/component', { // internal call fallback
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        if(debug){
          const j = await res.json();
            if(j.success) {
              results[p.path] = j.html;
              meta.push({ path:p.path, heuristics:j.meta?.heuristics||[], fallback:j.meta?.fallbackUsed||false });
            } else meta.push({ path:p.path, error:j.error||('HTTP '+res.status) });
        } else {
          if(!res.ok){
            const errTxt = await res.text();
            meta.push({ path:p.path, error:errTxt||('HTTP '+res.status) });
          } else {
            const txt = await res.text();
            results[p.path] = txt;
            meta.push({ path:p.path, ok:true });
          }
        }
      } catch(e){
        meta.push({ path:p.path, error:e.message });
      }
    }
    return json({ success:true, pages:Object.keys(results), manifest: results, meta });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

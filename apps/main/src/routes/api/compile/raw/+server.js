import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { rewriteImports } from '$lib/imports/rewrite';

// Index minimal en mémoire basé sur les dépendances passées dans la requête (si fournies)
function buildIndex(deps){
  const files = new Set(Object.keys(deps||{}));
  return {
    has: (p)=> files.has(p),
    resolveLocal: (base, spec)=>{
      const dir = base.split('/').slice(0,-1).join('/');
      const direct = spec.includes('/') ? spec : ('components/'+spec);
      const candidates=[];
      for(const f of files){
        if(f.startsWith(dir+'/') && f.endsWith('/'+spec+'.svelte')) candidates.push(f.slice(dir.length+1));
        if(f.startsWith('src/lib/') && f.endsWith('/'+spec+'.svelte')) candidates.push(f.replace('src/lib/','$lib/'));
        if(f.startsWith(dir+'/') && f.endsWith('/'+direct+'.svelte')) candidates.push(f.slice(dir.length+1));
      }
      return [...new Set(candidates)];
    }
  };
}

// Endpoint minimaliste sans heuristiques / fallback pour diagnostiquer le SSR réel
// Body: { code:string, generate?: 'ssr'|'dom', filename?: string }
export async function POST({ request }) {
  try {
    const { code, generate = 'ssr', filename = 'Component.svelte', dependencies = null, autofix = true } = await request.json();
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    try {
      let working = code;
      let rewrites=null;
      if(autofix){
        try {
          const index = buildIndex(dependencies||{});
          rewrites = await rewriteImports(filename, working, index);
          working = rewrites.code;
        } catch(e){ /* ignore rewrite errors */ }
      }
      const c = compile(working, { generate, hydratable:true, filename });
      return json({ success:true, js: c.js?.code || null, css: c.css?.code || null, warnings: c.warnings||[], rewrites, ast: undefined });
    } catch(e){
      const loc = e.start ? { line:e.start.line, column:e.start.column } : null;
      return json({ success:false, error: e.message, position: loc, stack: e.stack?.split('\n').slice(0,5).join('\n') }, { status:400 });
    }
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

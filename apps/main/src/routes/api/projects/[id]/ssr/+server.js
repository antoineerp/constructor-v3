import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { supabase } from '$lib/supabase.js';

// Endpoint expérimental SSR minimal (pas de vrai router SvelteKit complet)
// GET /api/projects/:id/ssr?path=/chemin
// Retour: { success, html, css, head, timings, route }

export async function GET(event){
  const started = Date.now();
  const { params, url, locals } = event;
  const projectId = params.id;
  const targetPath = url.searchParams.get('path') || '/';
  try {
    const qb = supabase.from('projects').select('*').eq('id', projectId).limit(1);
    if(locals.user?.id) qb.eq('user_id', locals.user.id);
    const { data: rows, error } = await qb;
    if(error) throw error;
    if(!rows || !rows.length) return json({ success:false, error:'Projet introuvable' }, { status:404 });
    const files = rows[0].code_generated;
    if(!files) return json({ success:false, error:'Aucun code' }, { status:404 });
    // Recenser pages
    const pages = Object.keys(files).filter(f=> f.startsWith('src/routes/') && f.endsWith('+page.svelte'));
    // Mapper path
    function toUrl(file){
      const rel = file.replace(/^src\/routes\//,'').replace(/\/\+page\.svelte$/,'');
      return rel ? '/' + rel : '/';
    }
    let match = null;
    let isDynamic = false;
    let paramsObj = {};
    // D'abord exact
    for(const p of pages){ if(toUrl(p)===targetPath){ match = p; break; } }
    // Sinon dynamiques simples [slug]
    if(!match){
      for(const p of pages){
        const urlPattern = toUrl(p);
        if(urlPattern.includes('[')){
          // Transformer segments
            const segs = urlPattern.split('/').filter(Boolean);
            const tSegs = targetPath.split('/').filter(Boolean);
            if(segs.length !== tSegs.length) continue;
            let ok=true; const tempParams={};
            for(let i=0;i<segs.length;i++){
              const s = segs[i]; const t = tSegs[i];
              const m = s.match(/^\[([^\]]+)\]$/);
              if(m){ tempParams[m[1]] = decodeURIComponent(t); continue; }
              if(s!==t){ ok=false; break; }
            }
            if(ok){ match = p; paramsObj = tempParams; isDynamic = true; break; }
        }
      }
    }
    if(!match){
      return json({ success:false, error:'Route non trouvée', available: pages.map(toUrl) }, { status:404 });
    }
    // Collecter layouts
    function collectLayouts(pageFile){
      const rel = pageFile.replace(/^src\/routes\//,'');
      const segs = rel.split('/');
      segs.pop();
      const candidates = ['src/routes/+layout.svelte'];
      let acc = 'src/routes';
      for(const s of segs){ acc += '/' + s; candidates.push(acc + '/+layout.svelte'); }
      return candidates.filter(c=> files[c]);
    }
    const layouts = collectLayouts(match);
    // Créer wrapper SSR
    const imports = [`import Page from '${match}';`];
    layouts.forEach((l,i)=> imports.push(`import L${i} from '${l}';`));
    const open = layouts.map((_,i)=> `<L${i} {params} {data}>`).join('');
    const close = layouts.map((_,i)=> `</L${layouts.length-1-i}>`).join('');
    const wrapperSource = `<script>export let params; export let data; ${imports.map(l=> l).join('\n')}</script>${open}<Page {params} {data}/> ${close}`;
    const compiledLayouts = [];
    try {
      // Compile chaque layout + page en SSR pour résoudre dépendances
      for(const lay of [...layouts, match]){
        const c = compile(files[lay], { generate:'ssr', format:'esm', filename: lay });
        compiledLayouts.push({ file: lay, js: c.js.code });
      }
    } catch(e){
      return json({ success:false, error:'Compilation SSR échouée', detail:e.message }, { status:500 });
    }
    // Compile wrapper SSR
    let wrapperJs, wrapperCss='';
    try {
      const w = compile(wrapperSource, { generate:'ssr', format:'esm', filename:'__wrapper_ssr.svelte' });
      wrapperJs = w.js.code;
      if(w.css && w.css.code) wrapperCss += w.css.code;
    } catch(e){
      return json({ success:false, error:'Wrapper SSR fail', detail:e.message }, { status:500 });
    }
    // Exécuter SSR dans sandbox Function
    function createModule(code){
      const module = { exports:{} };
      const fn = new Function('module','exports', code);
      fn(module, module.exports);
      return module.exports;
    }
    const exportedLayouts = compiledLayouts.map(c=> ({ file: c.file, mod: createModule(c.js) }));
    const wrapperMod = createModule(wrapperJs);
    const Wrapper = wrapperMod.default;
    if(!Wrapper || typeof Wrapper.render !== 'function'){
      return json({ success:false, error:'Wrapper SSR ne fournit pas render()' }, { status:500 });
    }
    // (Pas de load server ici encore) Data simple
    const { html, head, css } = Wrapper.render({ params: paramsObj, data: {} });
    const total = Date.now()-started;
    return json({ success:true, html, head, css: css?.code || '', styles: wrapperCss, route: targetPath, dynamic: isDynamic, params: paramsObj, timings:{ total } });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

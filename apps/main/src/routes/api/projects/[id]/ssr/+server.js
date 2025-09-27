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
    /**
     * Exécution minimaliste des load() :
     * - Supporte +layout.server.js / +layout.js / +page.server.js / +page.js
     * - Chaîne: root layout -> ... -> page
     * - Pour chaque niveau: server puis universal
     * - Fusionne props (profondeur écrase profondeur précédente)
     * Limitations: pas de stuff, status, cookies, setHeaders / redirect natif SvelteKit.
     */

    function deriveLoadJsFiles(layoutSveltePath){
      // layoutSveltePath ex: src/routes/blog/+layout.svelte
      const baseDir = layoutSveltePath.replace(/\/+layout\.svelte$/, '');
      const filesLocal = [];
      const serverPath = baseDir + '/+layout.server.js';
      const uniPath = baseDir + '/+layout.js';
      if(files[serverPath]) filesLocal.push({ type:'layout-server', file: serverPath });
      if(files[uniPath]) filesLocal.push({ type:'layout-universal', file: uniPath });
      return filesLocal;
    }
    function derivePageJsFiles(pageSveltePath){
      const baseDir = pageSveltePath.replace(/\/+page\.svelte$/, '');
      const out = [];
      const serverPath = baseDir + '/+page.server.js';
      const uniPath = baseDir + '/+page.js';
      if(files[serverPath]) out.push({ type:'page-server', file: serverPath });
      if(files[uniPath]) out.push({ type:'page-universal', file: uniPath });
      return out;
    }

    // Construction de la chaîne ordonnée
    const loadLayers = [];
    for(const l of layouts){
      loadLayers.push({ kind:'layout', svelte:l, js: deriveLoadJsFiles(l) });
    }
    loadLayers.push({ kind:'page', svelte: match, js: derivePageJsFiles(match) });

    function buildLoadModule(code){
      // Transformations basiques ESM -> fonction isolée
      let transformed = code
        .replace(/export\s+async\s+function\s+load/,'async function load')
        .replace(/export\s+function\s+load/,'function load')
        .replace(/export\s+const\s+load\s*=\s*/,'const load = ')
        .replace(/export\s*{\s*load\s*};?/,'');
      // Expose load via module.exports
      transformed += '\nif (typeof load!=="undefined") module.exports.load = load;';
      const module = { exports:{} };
      try {
        const fn = new Function('module','exports', transformed);
        fn(module, module.exports);
        return module.exports.load || null;
      } catch(e){
        return { __error: e.message };
      }
    }

    async function runWithTimeout(fn, arg, ms=2000){
      return await Promise.race([
        Promise.resolve().then(()=> fn(arg)),
        new Promise((_,rej)=> setTimeout(()=> rej(new Error('load timeout '+ ms+'ms')), ms))
      ]);
    }

    const mergedData = {};
    const debugLoads = [];
    for(const layer of loadLayers){
      for(const entry of layer.js){
        const source = files[entry.file];
        const loadFn = buildLoadModule(source);
        if(!loadFn){
          debugLoads.push({ file: entry.file, skipped:'no load' });
          continue;
        }
        if(loadFn.__error){
          debugLoads.push({ file: entry.file, error: loadFn.__error });
          continue;
        }
        const phase = entry.type.includes('server') ? 'server' : 'universal';
        const previousSnapshot = { ...mergedData };
        const loadEvent = {
          params: paramsObj,
          routeId: targetPath,
          url: new URL(targetPath, url.origin),
          fetch: fetch,
            parent: async ()=> previousSnapshot,
          // Placeholders
          depends(){},
          setHeaders(){},
          cookies: { get(){}, set(){}, delete(){} }
        };
        try {
          const r = await runWithTimeout(loadFn, loadEvent, 3000);
          if(r && typeof r === 'object'){
            if(r.redirect){
              return json({ success:false, redirect:r.redirect, location:r.location || r.redirect, from: entry.file });
            }
            if(r.error){
              return json({ success:false, error:'load error', detail:r.error, from: entry.file, status:r.status||500 }, { status: r.status||500 });
            }
            if(r.props && typeof r.props === 'object'){
              Object.assign(mergedData, r.props);
            }
          }
          debugLoads.push({ file: entry.file, phase, ok:true });
        } catch(e){
          debugLoads.push({ file: entry.file, phase, error:e.message });
        }
      }
    }

    // Hydratation: compiler version DOM du wrapper pour montée client
    let domWrapperJs=null; let domCompileErr=null;
    try {
      const wDom = compile(wrapperSource, { generate:'dom', format:'esm', filename:'__wrapper_dom.svelte', hydratable:true });
      domWrapperJs = wDom.js.code;
    } catch(e){ domCompileErr = e.message; }

    const { html, head, css } = Wrapper.render({ params: paramsObj, data: mergedData });
    let hydrationScript='';
    if(domWrapperJs){
      const b64 = Buffer.from(domWrapperJs, 'utf-8').toString('base64');
      const dataB64 = Buffer.from(JSON.stringify({ params: paramsObj, data: mergedData }), 'utf-8').toString('base64');
      hydrationScript = `<script>(function(){try{const js=atob('${b64}');const blob=new Blob([js],{type:'text/javascript'});const u=URL.createObjectURL(blob);const init=JSON.parse(atob('${dataB64}'));import(u).then(m=>{const C=m.default||m;const r=document.getElementById('__app');if(r){new C({target:r, hydrate:true, props:init});}}).catch(e=>console.warn('Hydration failed',e));}catch(e){console.warn('Hydration bootstrap error',e);}})();</script>`;
    } else if(domCompileErr){
      hydrationScript = `<!-- dom compile error: ${domCompileErr} -->`;
    }
    const htmlHydratable = `<!DOCTYPE html><html><head>${head||''}${css?.code?`<style>${css.code}</style>`:''}${wrapperCss?`<style>${wrapperCss}</style>`:''}</head><body><div id="__app">${html}</div>${hydrationScript}</body></html>`;
    const total = Date.now()-started;
    return json({ success:true, html, head, css: css?.code || '', styles: wrapperCss, route: targetPath, dynamic: isDynamic, params: paramsObj, data: mergedData, loads: debugLoads, hydratable: !!domWrapperJs, htmlHydratable, timings:{ total } });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

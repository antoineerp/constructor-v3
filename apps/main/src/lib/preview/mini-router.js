// Mini router client pour la preview (mode B/C) sans SvelteKit complet.
// Ajouts:
// - Support basique de +layout.svelte (root + layout de dossier direct) sans vraie projection de <slot/>.
// - Montée progressive: Layout(s) puis Page; tentative d'ancrage dans un élément "[data-preview-slot]" ou "#preview-slot" si présent.
// Usage: mountPreviewRouter({ modules, target: HTMLElement });
// modules: [{ path: 'src/routes/+page.svelte' | 'src/routes/+layout.svelte' | 'src/routes/segment/+layout.svelte', jsCode, ... }]

export function mountPreviewRouter({ modules, target }) {
  if (!target) throw new Error('mountPreviewRouter: target manquant');

  // Indexer les blobs + conserver le code pour hashing
  const blobFor = new Map();
  const codeFor = new Map();
  for (const m of modules) {
    if (m.error || !m.jsCode) continue;
    if (/^src\/routes\//.test(m.path)) {
      const blobUrl = URL.createObjectURL(new Blob([m.jsCode], { type: 'text/javascript' }));
      blobFor.set(m.path, blobUrl);
      codeFor.set(m.path, m.jsCode);
    }
  }

  // Détecter éventuels wrappers précompilés (pattern -> jsCode)
  const precompiledWrappers = new Map();
  const loadScripts = new Map(); // path -> blobUrl (ESM qui peut exporter load())
  for(const m of modules){
    if(m.wrapper && m.pattern && m.jsCode){
      precompiledWrappers.set(m.pattern, m);
      continue;
    }
    if(m.loadScript && m.path && m.jsCode){
      const blobUrl = URL.createObjectURL(new Blob([m.jsCode], { type:'text/javascript' }));
      loadScripts.set(m.path, blobUrl);
    }
  }

  // Construire table de routes statiques + dynamiques
  const routeMap = new Map(); // chemin exact -> entry
  const dynamicRoutes = []; // { regex, paramNames, entry }
  for (const pagePath of blobFor.keys()) {
    if (!/\+page\.svelte$/.test(pagePath)) continue;
    const rel = pagePath.replace(/^src\/routes\//, '').replace(/\/\+page\.svelte$/, '');
    const layouts = collectLayouts(pagePath, blobFor);
    const segments = rel === '' ? [] : rel.split('/');
    const hasDynamic = segments.some(s => /\[[^/]+\]/.test(s));
    if (!hasDynamic) {
      const urlPath = rel === '' ? '/' : `/${segments.join('/')}`;
      routeMap.set(urlPath, { page: pagePath, layouts, dynamic:false, pattern:urlPath, paramNames:[] });
    } else {
      const paramNames = [];
      let hasCatchAll = false;
      const regexParts = segments.map(seg => {
        // Catch-all: [...rest]
        const catchAll = seg.match(/^\[\.\.\.([^\]]+)\]$/);
        if (catchAll) { hasCatchAll = true; paramNames.push(catchAll[1]); return '(.*)'; }
        const m = seg.match(/^\[([^\]]+)\]$/);
        if (m) { paramNames.push(m[1]); return '([^/]+)'; }
        return seg.replace(/[-/\\^$*+?.()|[\]{}]/g, ch=>`\\${ch}`);
      });
      const pattern = '/' + regexParts.join('/');
      const regex = new RegExp('^' + (pattern === '/' ? '' : pattern) + '$');
      // Poids pour tri: plus de segments statiques + moins de catch-all d'abord
      const staticCount = segments.filter(s=>!s.match(/\[/)).length;
      dynamicRoutes.push({ regex, paramNames, entry:{ page: pagePath, layouts, dynamic:true, pattern, paramNames }, weight:{ staticCount, hasCatchAll } });
    }
  }
  // Trier dynamiques: d'abord plus de segments statiques, puis ceux sans catch-all
  dynamicRoutes.sort((a,b)=>{
    if (b.weight.staticCount !== a.weight.staticCount) return b.weight.staticCount - a.weight.staticCount;
    if (a.weight.hasCatchAll !== b.weight.hasCatchAll) return a.weight.hasCatchAll ? 1 : -1;
    // fallback longueur pattern (plus long d'abord)
    return b.entry.pattern.length - a.entry.pattern.length;
  });

  let mounted = { instances: [], route: null };
  const compositeCache = new Map(); // cacheKey:hash -> blob wrapper compilé

  function hashString(str){
    // djb2 simplifié
    let h = 5381; let i = str.length;
    while(i) h = (h * 33) ^ str.charCodeAt(--i);
    return (h >>> 0).toString(36);
  }

  function computeWrapperHash(entry){
    const parts = [];
    for(const l of entry.layouts) parts.push(codeFor.get(l) || '');
    parts.push(codeFor.get(entry.page) || '');
    return hashString(parts.join('\u0000'));
  }

  async function runLoadChain(entry, params){
    // entry.layouts: du plus global au plus spécifique
    let data = {};
    for(const layoutPath of entry.layouts){
      const scriptPath = layoutPath.replace(/\.svelte$/, '.js');
      const tsPath = layoutPath.replace(/\.svelte$/, '.ts');
      let url = loadScripts.get(scriptPath) || loadScripts.get(tsPath);
      if(url){
        try {
          const mod = await import(/* @vite-ignore */ url);
          if(typeof mod.load === 'function'){
            const partial = await mod.load({ params, data });
            if(partial && typeof partial === 'object') data = { ...data, ...partial };
          }
        } catch(e){ console.warn('[preview] load() layout error', layoutPath, e); }
      }
    }
    // Page level
    const pageScript = entry.page.replace(/\.svelte$/, '.js');
    const pageTs = entry.page.replace(/\.svelte$/, '.ts');
    let pageUrl = loadScripts.get(pageScript) || loadScripts.get(pageTs);
    if(pageUrl){
      try {
        const mod = await import(/* @vite-ignore */ pageUrl);
        if(typeof mod.load === 'function'){
          const partial = await mod.load({ params, data });
          if(partial && typeof partial === 'object') data = { ...data, ...partial };
        }
      } catch(e){ console.warn('[preview] load() page error', entry.page, e); }
    }
    return data;
  }

  async function render(pathname, replace = false) {
    let params = {};
    let entry = routeMap.get(pathname);
    if(!entry){
      for(const dyn of dynamicRoutes){
        const m = dyn.regex.exec(pathname);
        if(m){
          dyn.paramNames.forEach((n,i)=> params[n] = decodeURIComponent(m[i+1]));
          entry = dyn.entry; break;
        }
      }
    }
    if(!entry && pathname !== '/') entry = routeMap.get('/');
    if (!entry) return;
    if (mounted.instances.length) {
      for (const inst of mounted.instances) inst?.$destroy?.();
      mounted = { instances: [], route: null };
    }
    target.innerHTML = '';

    // Micro load(): exécuter avant instanciation
    let loadData = {};
    try { loadData = await runLoadChain(entry, params); } catch(_e){}

    // Chemin 1: layouts présents -> wrapper
    if (entry.layouts.length) {
      try {
        const baseKey = entry.dynamic ? '__dyn__' + entry.pattern : pathname;
        const contentHash = computeWrapperHash(entry);
        const fullKey = baseKey + ':' + contentHash;
        let blobWrapperUrl = compositeCache.get(fullKey);
        if (!blobWrapperUrl) {
          // Si wrapper précompilé disponible pour ce pattern ET hash correspondant, utiliser directement
          const pre = precompiledWrappers.get(entry.pattern);
          if(pre && (!pre.hash || pre.hash === contentHash)){
            blobWrapperUrl = URL.createObjectURL(new Blob([pre.jsCode], { type:'text/javascript' }));
            compositeCache.set(fullKey, blobWrapperUrl);
          } else {
          const pageBlob = blobFor.get(entry.page);
          const layoutBlobs = entry.layouts.map(l => blobFor.get(l));
          // Générer code Svelte wrapper
          const imports = [`import Page from '${pageBlob}';`];
          layoutBlobs.forEach((b,i)=> imports.push(`import L${i} from '${b}';`));
          const openTags = layoutBlobs.map((_,i)=> `<L${i} {params} {data}>`).join('');
          const closeTags = layoutBlobs.map((_,i)=> `</L${layoutBlobs.length-1 - i}>`).join('');
          const wrapperSource = `<script>\n${imports.join('\n')}\nexport let params;\nexport let data;\n</script>\n${openTags}<Page {params} {data}/> ${closeTags}`;
          // Compilation dynamique client
          const { compile } = await import('svelte/compiler');
          const { js } = compile(wrapperSource, { generate:'dom', format:'esm', filename:'__preview_wrapper.svelte' });
          blobWrapperUrl = URL.createObjectURL(new Blob([js.code], { type:'text/javascript' }));
          // Invalidation anciennes versions de la même baseKey
            for(const k of compositeCache.keys()){
              if(k.startsWith(baseKey + ':') && k !== fullKey){
                try { URL.revokeObjectURL(compositeCache.get(k)); } catch(_e){}
                compositeCache.delete(k);
              }
            }
          compositeCache.set(fullKey, blobWrapperUrl);
          }
        }
        const mod = await import(/* @vite-ignore */ blobWrapperUrl);
        const Wrapper = mod.default;
  const instance = new Wrapper({ target, props: { ...(Object.keys(params).length? { params } : {}), data: loadData } });
        if (!replace) history.pushState({}, '', pathname);
        mounted = { instances: [instance], route: pathname };
        return;
      } catch (e) {
        console.warn('[preview] wrapper layout compile failed, fallback séquentiel:', e.message);
        // Fallback: instanciation séquentielle comme avant
      }
    }
    // Chemin 2 (fallback ou absence layouts): simple page seule
    try {
      const pageUrl = blobFor.get(entry.page);
      const pageMod = await import(/* @vite-ignore */ pageUrl);
      const PageComp = pageMod.default;
  const pageInstance = new PageComp({ target, props: { ...(Object.keys(params).length? { params } : {}), data: loadData } });
      if (!replace) history.pushState({}, '', pathname);
      mounted = { instances: [pageInstance], route: pathname };
    } catch (e) {
      target.innerHTML = `<pre style="color:#b91c1c; padding:0.75rem; background:#fee2e2; border:1px solid #fecaca; font-size:12px;">Erreur preview: ${e.message}</pre>`;
    }
  }

  function isInternalAnchor(a) {
    return a.origin === location.origin && routeMap.has(a.pathname);
  }

  addEventListener('click', (e) => {
    const a = e.target?.closest?.('a');
    if (!a) return;
    if (isInternalAnchor(a)) {
      e.preventDefault();
      render(a.pathname);
    }
  });

  addEventListener('popstate', () => render(location.pathname, true));
  render(location.pathname || '/', true);

  return { navigate: (p) => render(p), destroy: () => { mounted.instances.forEach(i=>i?.$destroy?.()); mounted.instances=[]; } };
}

function collectLayouts(pagePath, blobFor){
  // Exemple: src/routes/admin/stats/+page.svelte
  // Candidats: src/routes/+layout.svelte, src/routes/admin/+layout.svelte, src/routes/admin/stats/+layout.svelte
  const rel = pagePath.replace(/^src\/routes\//,'');
  const segments = rel.split('/');
  segments.pop(); // retire +page.svelte
  const candidates = [];
  // root
  candidates.push('src/routes/+layout.svelte');
  let accum = 'src/routes';
  for (const seg of segments) {
    accum += '/' + seg;
    candidates.push(accum + '/+layout.svelte');
  }
  const found = [];
  for (const c of candidates) {
    if (blobFor.has(c)) found.push(c);
  }
  // Dédupliquer en conservant ordre du plus global au plus spécifique
  return [...new Set(found)];
}

// TODO (évolutions):
// - Injecter dynamiquement la page dans le vrai <slot/> (nécessite wrapper recompilé ou instrumentation compile côté serveur).
// - Supporter +layout.server/+page.server (data load) → compilation multi-fichier + exécution load().
// - Routes dynamiques [slug] → mapping regex.
// - Invalidation fine par dépendances.

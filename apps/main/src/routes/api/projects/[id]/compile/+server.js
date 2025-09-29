import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'node:child_process';
import path from 'path';

import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

import { computeProjectHash, getCached, setCached } from '$lib/preview/compileCache.js';
import { fixRouteImports } from '$lib/fix/routeImports.js';
import { supabase as clientSupabase, isSupabaseEnabled } from '$lib/supabase.js';

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
  const { entries = [], files: injectedFiles, file, autoFix } = body;
  try {
    let projectFiles = injectedFiles;
    if(!projectFiles){
      if(isSupabaseEnabled){
        const qb = clientSupabase.from('projects').select('*').eq('id', projectId);
        if(locals.user?.id) qb.eq('user_id', locals.user.id);
        const { data: project, error } = await qb.single();
        if(error) throw error;
        if(!project?.code_generated) return json({ success:false, error:'Aucun code généré' }, { status:404 });
        projectFiles = project.code_generated;
      } else {
        // Fallback mémoire (sandbox déconnecté)
        projectFiles = {
          'src/routes/+page.svelte': `<script>let n=0; const inc=()=>n++;<\/script>\n<h1 class="text-2xl font-bold text-indigo-600">Projet Démo {n}</h1>\n<button class="px-3 py-1 bg-indigo-600 text-white rounded" on:click={inc}>Incrémenter ({n})</button>\n<p class="text-xs text-gray-500">Fallback offline (no Supabase).</p>`,
          'src/routes/about/+page.svelte': `<h2 class="text-xl font-semibold text-purple-600">À propos</h2><p class="text-sm text-gray-600">Page secondaire (fallback).</p>`,
          'src/app.css': `@tailwind base;@tailwind components;@tailwind utilities; h1{font-family:system-ui}`,
          'tailwind.config.cjs': `module.exports={content:["./src/**/*.svelte"],theme:{extend:{}}}`
        };
      }
    }
    // Détection brute imports interdits (avant compilation Svelte) sur l'ensemble des fichiers
    const preInvalidImports = [];
    try {
      const routeImportPattern = /import\s+[^;]*from\s+['"]([^'"\n]+)['"]/g;
      for(const [fname, code] of Object.entries(projectFiles)){
        if(!fname.endsWith('.svelte') && !fname.endsWith('.js') && !fname.endsWith('.ts')) continue;
        let m; while((m = routeImportPattern.exec(code))){
          const spec = m[1];
          if(/(^|\/)(\.\.\/)+routes\//.test(spec) || /(^|\/)routes\//.test(spec) || /src\/routes\//.test(spec)){
            if(/\+page\.svelte$/.test(spec) || /\+layout\.svelte$/.test(spec)){
              preInvalidImports.push({ from: fname, spec, line: code.slice(0,m.index).split('\n').length });
            }
          }
        }
      }
    } catch(_e){ /* ignore scan errors */ }
    // Filtrer uniquement fichiers Svelte + JS potentiels
  const svelteEntries = Object.entries(projectFiles).filter(([k])=> k.endsWith('.svelte'));
  const loadScriptEntries = Object.entries(projectFiles).filter(([k])=> /\+(page|layout)\.(js|ts)$/.test(k));
    if(!svelteEntries.length) return json({ success:false, error:'Aucun fichier Svelte' }, { status:404 });
  let entry = (file && projectFiles[file]) ? file : entries.find(e=> projectFiles[e]) || 'src/routes/+page.svelte';
  if(!projectFiles[entry]) entry = svelteEntries[0][0];
    const hash = computeProjectHash(projectFiles, { entry, variant:'dom-esm' });
    const cached = getCached(hash);
    if(typeof globalThis.__COMPILE_REQS === 'undefined') globalThis.__COMPILE_REQS = 0;
    globalThis.__COMPILE_REQS++;
    if(cached){
      return json({ success:true, cached:true, projectHash: hash, requestCount: globalThis.__COMPILE_REQS, ...cached });
    }
  const modules = [];
  const invalidImports = [];
  let pageFiles = []; // sera recalculé après boucle
    // Caching CSS (hash sur app.css + tailwind.config.cjs)
    let globalCss = '';
    let cssHash = null;
    const hasTailwind = !!projectFiles['src/app.css'] && !!projectFiles['tailwind.config.cjs'];
    const cssCacheTTLms = 2 * 60 * 1000; // 2 minutes
    // Module-level cache (closure)
    if(typeof globalThis.__TAILWIND_CSS_CACHE === 'undefined') globalThis.__TAILWIND_CSS_CACHE = new Map();
    const cssCache = globalThis.__TAILWIND_CSS_CACHE;
    try {
      if(hasTailwind){
        cssHash = crypto.createHash('sha1').update(projectFiles['src/app.css']).update(projectFiles['tailwind.config.cjs']).digest('hex');
        const cached = cssCache.get(cssHash);
        if(cached && (Date.now() - cached.t) < cssCacheTTLms){
          globalCss = cached.css;
        } else {
          const tmpDir = `/tmp/preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          fs.mkdirSync(tmpDir, { recursive:true });
          try {
            fs.writeFileSync(`${tmpDir}/tailwind.config.cjs`, projectFiles['tailwind.config.cjs']);
            fs.writeFileSync(`${tmpDir}/app.css`, projectFiles['src/app.css']);
            try {
              const out = execSync(`npx tailwindcss -i ${tmpDir}/app.css -c ${tmpDir}/tailwind.config.cjs --minify`, { encoding:'utf-8', stdio:['ignore','pipe','pipe'], timeout:8000 });
              globalCss = out.trim();
              cssCache.set(cssHash, { css: globalCss, t: Date.now() });
            } catch(e){ /* ignore tailwind failure */ }
          } finally {
            try { fs.rmSync(tmpDir, { recursive:true, force:true }); } catch(_e){ /* ignore */ }
          }
        }
      }
    } catch(e){ /* ignore env fs / hash issues */ }
    const fileSet = new Set(svelteEntries.map(e=> e[0]));
    function resolveImport(spec, from){
      if(!spec.startsWith('.')) return null; // only relative
      const baseDir = path.posix.dirname(from);
      let full = path.posix.normalize(path.posix.join(baseDir, spec));
      if(!/\.svelte$/i.test(full)) full += '.svelte';
      return fileSet.has(full) ? full : null;
    }
    const importStmtRegex = /import\s+[^'";]*?from\s+['"]([^'"\n]+)['"];?|import\s+['"]([^'"\n]+)['"];?/g;
    for(const [pathName, source] of svelteEntries){
      let css = ''; let jsCode = ''; let error = null;
      try {
        const c = compile(source, { generate:'dom', filename: pathName, css:'injected' });
        jsCode = c.js.code;
        // Inline CSS si présent (simple concat) — amélioration future: module séparé
        if(c.css && c.css.code){
          jsCode = `/* <style> inlined */\n` + jsCode + `\n/*# sourceMappingURL omitted */`;
        }
        // Collect imports relatifs
        const importMap = [];
        let m;
        while((m = importStmtRegex.exec(jsCode))){
          const spec = m[1] || m[2];
            if(!spec) continue;
            const resolved = resolveImport(spec, pathName);
            if(resolved) importMap.push({ spec, target: resolved });
            if(/^(\.\.\/)+routes\//.test(spec) || /^(\.\.?\/)?routes\//.test(spec) || /src\/routes\//.test(spec)){
              invalidImports.push({ from: pathName, spec });
            }
        }
        // Scan brut du source original aussi (au cas où l'import a été tree-shaké)
        try {
          const rawImportRe = /import\s+[^;]*from\s+['"]([^'"\n]+)['"]/g;
          let rm; while((rm = rawImportRe.exec(source))){
            const spec = rm[1];
            if(/routes\/[^'";]+\+page\.svelte$/.test(spec) || /routes\/[^'";]+\+layout\.svelte$/.test(spec)){
              invalidImports.push({ from: pathName, spec, raw:true });
            }
          }
        } catch(_e){ /* ignore raw scan */ }
        modules.push({ path: pathName, jsCode, imports: importMap });
      } catch(e){
        modules.push({ path: pathName, error: e.message });
      }
    }
    // Ajouter scripts load comme modules bruts (pas de compilation Svelte)
    for(const [scriptPath, code] of loadScriptEntries){
      modules.push({ path: scriptPath, jsCode: code, loadScript: true });
    }
  const routeCandidates = Object.keys(projectFiles).filter(f=> f.startsWith('src/routes/') && f.endsWith('.svelte'));
  // Recalcul pages (plus fiable que détection inline)
  pageFiles = modules.filter(m=> m.path && /\/\+page\.svelte$/.test(m.path)).map(m=> m.path);

  // ---------- Précompilation wrappers (layouts + page) ----------
  function collectLayouts(pagePath){
    const rel = pagePath.replace(/^src\/routes\//,'');
    const segments = rel.split('/');
    segments.pop(); // remove +page.svelte
    const candidates = ['src/routes/+layout.svelte'];
    let accum = 'src/routes';
    for(const seg of segments){ accum += '/' + seg; candidates.push(accum + '/+layout.svelte'); }
    const found = [];
    for(const c of candidates){ if(projectFiles[c]) found.push(c); }
    return [...new Set(found)];
  }
  function hashStr(str){ let h=5381,i=str.length; while(i) h=(h*33)^str.charCodeAt(--i); return (h>>>0).toString(36); }

  const wrappers = [];
  for(const pagePath of pageFiles){
    try {
      const layouts = collectLayouts(pagePath);
      const rel = pagePath.replace(/^src\/routes\//,'').replace(/\/\+page\.svelte$/, '');
      const segments = rel === '' ? [] : rel.split('/');
      const hasDynamic = segments.some(s=> /\[[^/]+\]/.test(s));
      const paramNames = [];
      let pattern;
      if(!hasDynamic){
        pattern = segments.length ? '/' + segments.join('/') : '/';
      } else {
        const regexParts = segments.map(seg => {
          const catchAll = seg.match(/^\[\.\.\.([^\]]+)\]$/);
          if(catchAll){ paramNames.push(catchAll[1]); return '(.*)'; }
          const m = seg.match(/^\[([^\]]+)\]$/); if(m){ paramNames.push(m[1]); return '([^/]+)'; }
          return seg.replace(/[-/\\^$*+?.()|[\]{}]/g, ch=> `\\${ch}`);
        });
        pattern = '/' + regexParts.join('/');
      }
      // Générer code wrapper Svelte (imports vers chemins originaux, réécrits côté client en blob URLs)
      const imports = [`import Page from '${pagePath}';`];
      layouts.forEach((l,i)=> imports.push(`import L${i} from '${l}';`));
  const openTags = layouts.map((_,i)=> `<L${i} {params} {data}>`).join('');
  const closeTags = layouts.map((_,i)=> `</L${layouts.length-1 - i}>`).join('');
  const wrapperSource = `<script>\n${imports.join('\n')}\nexport let params;\nexport let data;\n</script>\n${openTags}<Page {params} {data}/> ${closeTags}`;
  const cWrap = compile(wrapperSource, { generate:'dom', filename:`__wrapper__${pattern}.svelte` });
      const codes = layouts.map(l=> projectFiles[l]||'').concat(projectFiles[pagePath]||'');
      const hash = hashStr(codes.join('\u0000'));
      wrappers.push({ pattern, dynamic: hasDynamic, paramNames, hash, jsCode: cWrap.js.code });
    } catch(e){
      wrappers.push({ pattern: pagePath, error: e.message });
    }
  }
  // Fallback: si aucune page n'a produit de wrapper (ex: heuristique ratée), créer un wrapper minimal pour l'entry principal
  if(wrappers.filter(w=> !w.error).length === 0 && modules.length){
    try {
      const entryMod = entry;
      const wrapperSource = `<script>import Page from '${entryMod}'; export let params; export let data;</script><Page {params} {data}/>`;
      const cWrap = compile(wrapperSource, { generate:'dom', filename:`__wrapper__/.svelte` });
      wrappers.push({ pattern:'/', dynamic:false, paramNames:[], hash: 'w0', jsCode: cWrap.js.code });
    } catch(_e){ /* ignore fallback failure */ }
  }
    // Récupération qualité la plus récente
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
    } catch(_e){ /* ignore quality fetch */ }
  const guardMeta = projectFiles.__guard_meta || null;
  const variantMeta = projectFiles.__variant_meta || null;
  // Exposer aussi les wrappers sous forme de pseudo-modules pour intégration directe côté client
  const wrapperModules = wrappers.filter(w=> !w.error).map(w=> ({
    wrapper: true,
    pattern: w.pattern,
    dynamic: w.dynamic,
    hash: w.hash,
    paramNames: w.paramNames,
    jsCode: w.jsCode
  }));
  let allInvalid = [...preInvalidImports, ...invalidImports];
  let autoFixReport = null;
  if(autoFix && allInvalid.length){
    const fix = fixRouteImports(projectFiles);
    autoFixReport = { created: fix.created, changes: fix.changes };
    // On ne recompile pas dans cette passe (éviter boucle) – on renvoie suggestion
  }
  const result = { modules: [...modules, ...wrapperModules], entry, cached:false, timings:{ total_ms: Date.now()-t0 }, routes: routeCandidates, wrappers, quality, validation_summary, css: globalCss, cssHash, guardMeta, variantMeta, invalidImports: allInvalid, autoFix: autoFixReport };
  // ----------- Construction d'un runtime HTML auto-porté (import map) -----------
  try {
    // Ne construire que si aucune erreur de compilation majeure dans modules
    const moduleErrors = modules.filter(m=> m.error);
    if(moduleErrors.length){
      const errHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Erreur compilation</title><style>body{font:12px monospace;background:#111;color:#eee;padding:16px}</style></head><body><h1>Erreurs</h1><ul>${moduleErrors.map(m=> `<li><strong>${m.path}</strong>: ${m.error.replace(/</g,'&lt;')}</li>`).join('')}</ul></body></html>`;
      result.runtimeHtml = errHtml;
    } else {
      const rewritten = new Map();
      const importRegex = /import\s+[^;'"`]+?from\s+['"]([^'"\n]+)['"];?|import\s+['"]([^'"\n]+)['"];?/g;
      function toAbsolute(spec, from){
        if(!spec) return spec;
        if(spec.startsWith('src/')) return spec; // déjà absolu relatif projet
        if(!spec.startsWith('.')) return spec; // dépendance externe (laisse tel quel)
        const baseDir = path.posix.dirname(from);
        const joined = path.posix.normalize(path.posix.join(baseDir, spec));
        return joined;
      }
      for(const m of modules){
        if(!m.jsCode) continue;
        let code = m.jsCode;
        code = code.replace(importRegex, (full, g1, g2) => {
          const orig = g1 || g2;
            if(!orig) return full;
            const abs = toAbsolute(orig, m.path);
            if(abs !== orig && /\.svelte$/.test(abs)){
              // remplacer dans la déclaration
              return full.replace(orig, abs);
            }
            if(/\.svelte$/.test(orig) && orig.startsWith('.')){
              // cas fallback
              const abs2 = toAbsolute(orig, m.path);
              return full.replace(orig, abs2);
            }
            return full;
        });
        rewritten.set(m.path, code);
      }
      // Construction d'un bundle inline plus fiable (évite import maps + CSP issues)
      const entryModule = rewritten.has(entry) ? entry : (rewritten.keys().next().value);
      if(!entryModule) throw new Error('Aucun module d\'entrée trouvé');
      
      // Créer un bundle inline avec tous les modules
      const bundleLines = [];
      
      // Ajouter tous les modules comme des exports globaux
      const moduleVars = new Map();
      let moduleCounter = 0;
      
      for(const [path, code] of rewritten.entries()){
        const varName = `__mod_${moduleCounter++}`;
        moduleVars.set(path, varName);
        // Transformer export default en variable globale
        const transformedCode = code
          .replace(/export\s+default\s+/, `window.${varName} = `)
          .replace(/import\s+([^;]+?)\s+from\s+['"]([^'"]+)['"];?/g, (match, imports, importPath) => {
            // Gérer les imports $lib/* en les stubant avec des objets par défaut
            if(importPath.startsWith('$lib/')){
              if(importPath === '$lib/supabase.js' || importPath === '$lib/supabase'){
                return `const ${imports.trim()} = { from: () => ({ select: () => Promise.resolve({ data: [], error: null }), eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }), auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) } };`;
              }
              // Autres imports $lib (componentGenerator, etc.)
              return `const ${imports.trim()} = {}; // $lib stub`;
            }
            
            const depVar = moduleVars.get(importPath);
            if(depVar){
              // Simple default import
              if(/^\w+$/.test(imports.trim())){
                return `const ${imports.trim()} = window.${depVar};`;
              }
            }
            return `// Import non résolu: ${match}`;
          });
        bundleLines.push(`// Module: ${path}`);
        bundleLines.push(transformedCode);
        bundleLines.push('');
      }
      
      // Script de démarrage
      const entryVar = moduleVars.get(entryModule);
      bundleLines.push(`// Démarrage`);
      bundleLines.push(`try{`);
      bundleLines.push(`  const App = window.${entryVar};`);
      bundleLines.push(`  if(App && typeof App === 'function'){`);
      bundleLines.push(`    new App({target: document.getElementById('app')});`);
      bundleLines.push(`  } else {`);
      bundleLines.push(`    throw new Error('Module d\\'entrée invalide: ' + typeof App);`);
      bundleLines.push(`  }`);
      bundleLines.push(`}catch(e){`);
      bundleLines.push(`  document.getElementById('app').innerHTML = '<pre style="color:#b91c1c;font:12px monospace;padding:8px;border:1px solid #fca5a5;border-radius:4px;background:#fef2f2">Erreur runtime: ' + (e.message || e) + '</pre>';`);
      bundleLines.push(`  console.error('Runtime error:', e);`);
      bundleLines.push(`}`);
      
      const bundleScript = bundleLines.join('\n');
      
      result.runtimeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Sandbox Runtime</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { padding: 16px; font-family: system-ui; }
    #app { min-height: 200px; }
  </style>
</head>
<body>
  <div id='app'>Initialisation...</div>
  <script>
${bundleScript}
  </script>
</body>
</html>`;
    }
  } catch(e){
    result.runtimeHtml = `<!DOCTYPE html><html><body><pre style='color:#b91c1c'>Runtime bundle error: ${String(e).replace(/</g,'&lt;')}</pre></body></html>`;
  }
    setCached(hash, result, 2*60*1000); // 2 min
  return json({ success:true, projectHash: hash, requestCount: globalThis.__COMPILE_REQS, ...result });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

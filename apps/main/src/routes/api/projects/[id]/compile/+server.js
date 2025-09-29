import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'node:child_process';
import path from 'path';

import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

import { computeProjectHash, getCached, setCached } from '$lib/preview/compileCache.js';
import { supabase as clientSupabase } from '$lib/supabase.js';

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
  const { entries = [], files: injectedFiles, file } = body;
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
  const pageFiles = []; // conserver liste pages pour wrappers
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
      try {
        const c = compile(source, { generate:'dom', format:'esm', filename: pathName, css:true });
        let jsCode = c.js.code;
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
        }
        modules.push({ path: pathName, jsCode, imports: importMap });
        if(/\/\+page\.svelte$/.test(pathName)) pageFiles.push(pathName);
      } catch(e){
        modules.push({ path: pathName, error: e.message });
      }
    }
    // Ajouter scripts load comme modules bruts (pas de compilation Svelte)
    for(const [scriptPath, code] of loadScriptEntries){
      modules.push({ path: scriptPath, jsCode: code, loadScript: true });
    }
  const routeCandidates = Object.keys(projectFiles).filter(f=> f.startsWith('src/routes/') && f.endsWith('.svelte'));

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
      const cWrap = compile(wrapperSource, { generate:'dom', format:'esm', filename:`__wrapper__${pattern}.svelte` });
      const codes = layouts.map(l=> projectFiles[l]||'').concat(projectFiles[pagePath]||'');
      const hash = hashStr(codes.join('\u0000'));
      wrappers.push({ pattern, dynamic: hasDynamic, paramNames, hash, jsCode: cWrap.js.code });
    } catch(e){
      wrappers.push({ pattern: pagePath, error: e.message });
    }
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
  const result = { modules: [...modules, ...wrapperModules], entry, cached:false, timings:{ total_ms: Date.now()-t0 }, routes: routeCandidates, wrappers, quality, validation_summary, css: globalCss, cssHash, guardMeta, variantMeta };
    setCached(hash, result, 2*60*1000); // 2 min
  return json({ success:true, projectHash: hash, requestCount: globalThis.__COMPILE_REQS, ...result });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

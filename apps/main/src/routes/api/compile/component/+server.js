import { createRequire } from 'module';

import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { rewriteImports } from '$lib/imports/rewrite';

// Forcer runtime Node (Vercel) pour ce handler lourd (compilation SSR)
// Node 18 rejeté par Vercel (message "invalid runtime"), on passe à Node 20.
export const config = { runtime: 'nodejs20.x' };

// Endpoint: compile & SSR un snippet Svelte (avec dépendances .svelte fournies) + hydratation.
// Body attendu: { code: string, dependencies?: { [path:string]: string }, debug?: boolean }
export async function POST(event) {
  try {
    const started = Date.now();
    const { request, fetch } = event;
    const body = await request.json();
  const { code, dependencies = {}, debug = false, strict = false, allowAutoRepair = true, _autoRepairAttempt = false, enableRendererNormalization = false, allowJQueryTransform = true, pure = false, autofix = true } = body || {};
  const effectiveRendererNormalization = !!enableRendererNormalization; // désactivé par défaut
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    // Précheck jQuery ($) si mode strict
    if(strict){
      const jqueryPattern = /\$\(document\)|\$\.ajax\s*\(|\$\([^)]*\)\s*\.(on|ready|ajax|addClass|removeClass|toggleClass|css|attr)\b/;
      if(jqueryPattern.test(code)){
        return json({ success:false, error:'Usage jQuery ($) détecté – interdit en mode strict.', stage:'precheck-jquery' }, { status:400 });
      }
    }
    if(typeof globalThis.__COMP_COMPONENT_COUNT === 'undefined') globalThis.__COMP_COMPONENT_COUNT = 0;
    globalThis.__COMP_COMPONENT_COUNT++;

    const codeHash = await (async () => {
      try { const { createHash } = await import('crypto'); return createHash('sha1').update(code).digest('hex').slice(0,12); } catch { return 'na'; }
    })();

  const originalSource = code;
  let autoRepairMeta = null; // stocke résultat éventuel de la tentative AI
    let source = code;
    let importRewrite = null;
    if(autofix){
      try {
        const index = { has:(p)=> !!dependencies[p], resolveLocal:(base,spec)=>{ const out=[]; for(const k of Object.keys(dependencies)){ if(k.endsWith('/'+spec+'.svelte')) out.push(k); } return out; } };
        importRewrite = await rewriteImports('Component.svelte', source, index);
        source = importRewrite.code;
      } catch(_e){ /* ignore rewrite errors */ }
    }

    // Heuristique: ajouter un <script> minimal si contenu simple sans script pour permettre export de props.
  // Détection heuristique très simple de syntaxe Svelte; on évite les accolades brutes non échappées dans la RegExp.
  const hasSvelteSyntax = /<script[\s>]|\{#if|\{#each|on:[a-zA-Z]+=/u.test(source);
  if(!hasSvelteSyntax && !/<script[\s>]/.test(source)) {
      source = `<script>export let props = {};</script>\n${source}`;
    }

  const meta = { missingComponents: [], libStubs: [], depProvided: Object.keys(dependencies).length };
  const heuristics = [];
    const debugStages = debug ? { original: originalSource } : null;

    // Détection jQuery précoce et injection stub minimal (opt-out via allowJQueryTransform)
    if(/(\$\([^)]*\))|(\$\.[a-zA-Z]+)/.test(source)){
      if(!allowJQueryTransform){
        return json({ success:false, error:'Usage jQuery détecté (allowJQueryTransform=false)', stage:'jquery-detected' }, { status:400 });
      }
      if(!/\b(const|let|var|function)\s+\$\b/.test(source)){
        const stub = `<!-- jquery-lite stub -->\n<script>\nconst $ = (sel)=>{\n  const nodes = typeof document!=='undefined'? Array.from(document.querySelectorAll(sel)) : [];\n  const api = { on:(ev,h)=>{nodes.forEach(n=>n.addEventListener(ev,h));return api;}, addClass:(c)=>{nodes.forEach(n=>n.classList.add(c));return api;}, removeClass:(c)=>{nodes.forEach(n=>n.classList.remove(c));return api;}, toggleClass:(c)=>{nodes.forEach(n=>n.classList.toggle(c));return api;}, css:(p,v)=>{nodes.forEach(n=>{try{n.style[p]=v;}catch{}});return api;}, attr:(k,v)=>{ if(v===undefined) return nodes[0]?.getAttribute(k); nodes.forEach(n=>n.setAttribute(k,v)); return api;} };\n  return api;\n};\n</script>\n`;
        source = stub + source;
        heuristics.push('jquery-stub');
      } else {
        heuristics.push('jquery-present');
      }
    }

    // --- Helpers ---
    function injectUnknownComponentPlaceholders(src, metaObj){
      const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g; const found = new Set(); let m;
      while((m = tagRegex.exec(src))) found.add(m[1]);
      if(!found.size) return src;
      // Collecter déjà importés
      const imported = new Set();
      const importDecl = /import\s+([^;]+)from\s+['"][^'"]+['"]/g; let im;
      while((im = importDecl.exec(src))){
        im[1].split(/[,{}\s]/).map(s=> s.trim()).filter(Boolean).forEach(n=> imported.add(n.replace(/as.*/i,'')));
      }
      const toStub = [...found].filter(n=> !imported.has(n));
      if(!toStub.length) return src;
      metaObj.missingComponents = toStub;
      const stubLines = toStub.map(n=> `const ${n} = ({children})=>({ $$render:()=> '<div class="missing-component text-[10px] border border-dashed border-gray-300 rounded px-2 py-1 text-gray-500" data-missing-component="${n}">${n}</div>' });`);
      if(/<script[\s>]/.test(src)) return src.replace(/<script[\s>][^>]*>/, m=> m + '\n' + stubLines.join('\n'));
      return `<script>\n${stubLines.join('\n')}\n</script>\n${src}`;
    }

    function rewriteLibImports(src, metaObj, provided){
      const libRegex = /import\s+([^;]+?)\s+from\s+['"]\$lib\/(.+?)['"];?/g; let m; let out = src; const providedSet = new Set(Object.keys(provided)); const stubs=[];
      while((m = libRegex.exec(src))){
        const clause = m[1].trim(); let rel = m[2].trim();
        if(/\.(?:js|ts|mjs|cjs)$/i.test(rel)) continue; // ne pas stubber supabase.js & co.
        if(!/\.svelte$/i.test(rel)) rel += '.svelte';
        const full = 'src/lib/' + rel;
        if(providedSet.has(full)) continue;
        out = out.replace(m[0], '');
        const names=[]; const defaultMatch = clause.match(/^([A-Za-z0-9_]+)/); if(defaultMatch) names.push(defaultMatch[1]);
        const brace = clause.match(/\{([^}]+)\}/); if(brace){ brace[1].split(',').forEach(p=> { const nm = p.split(/\s+as\s+/i).pop().trim(); if(nm) names.push(nm); }); }
        for(const n of names){ stubs.push(`const ${n} = ({children})=>({ $$render:()=> '<div data-missing-lib="${full}" class="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-dashed border-amber-300 bg-amber-50 text-amber-600">${n}</div>' });`); }
      }
      if(stubs.length){ metaObj.libStubs = stubs.map(s=> s.match(/const\s+([A-Za-z0-9_]+)/)[1]);
        if(/<script[\s>]/.test(out)) out = out.replace(/<script[\s>][^>]*>/, mm=> mm + '\n' + stubs.join('\n')); else out = `<script>\n${stubs.join('\n')}\n</script>\n`+out; }
      return out;
    }

    function transformEsmToCjs(ssrCode){
      let out = ssrCode
        .replace(/import\s+([^;]+?)\s+from\s+["']svelte\/internal["'];?/g, (m,cl)=> `const ${cl.trim()} = require('svelte/internal');`)
        .replace(/import\s+([^;]+?)\s+from\s+["']([^"']+\.svelte)["'];?/g, (m,cl,spec)=> {
          let seg='';
            if(/\{/.test(cl)){
              const def = cl.match(/^([A-Za-z0-9_]+)/); const named = cl.match(/\{([^}]+)\}/);
              if(def) seg += `const ${def[1]} = __import('${spec}').default;`;
              if(named) seg += `const { ${named[1]} } = __import('${spec}');`;
              return seg;
            }
            if(/^\{/.test(cl.trim())) return `const ${cl.trim()} = __import('${spec}');`;
            return `const ${cl.trim()} = __import('${spec}').default;`;
        })
        .replace(/import\s+([^;]+?)\s+from\s+["']([^"']+\.(?:js|ts))["'];?/g, (m,cl,spec)=>{
          if(/\{/.test(cl)){
            const def = cl.match(/^([A-Za-z0-9_]+)/); const named = cl.match(/\{([^}]+)\}/); let seg='';
            if(def) seg += `const ${def[1]} = require('${spec}').default || require('${spec}');`;
            if(named) seg += `const { ${named[1]} } = require('${spec}');`;
            return seg;
          }
          if(/^\{/.test(cl.trim())) return `const ${cl.trim()} = require('${spec}');`;
          return `const ${cl.trim()} = require('${spec}').default || require('${spec}');`;
        })
        .replace(/import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+["']([^"']+)["'];?/g, (m,ns,spec)=> `const ${ns} = require('${spec}');`)
        .replace(/import\s+["']([^"']+)["'];?/g, (m,spec)=> `require('${spec}');`)
        .replace(/export\s+default\s+/g, 'module.exports.default = ')
        .replace(/export\s+\{([^}]+)\};?/g, (m,names)=> names.split(',').map(n=> n.trim()).filter(Boolean).map(spec=>{
          if(/\sas\s/i.test(spec)){
            const [orig, alias] = spec.split(/\sas\s/i).map(s=> s.trim());
            const target = alias === 'default' ? 'default' : alias.replace(/[^A-Za-z0-9_$]/g,'');
            return `module.exports.${target} = ${orig};`;
          }
          const nm = spec.replace(/[^A-Za-z0-9_$]/g,'');
          if(nm === 'default') return '';
          return `module.exports.${nm} = ${nm};`;
        }).join('\n'));
      if(/\bimport\s+/.test(out)) out = out.replace(/^\s*import\s+.*$/gm, '// __REMOVED_IMPORT__');
      return out;
    }

    // Appliquer réécritures pré-compilation (placeholders & lib)
  const afterLib = rewriteLibImports(source, meta, dependencies); if(debugStages) debugStages.afterLib = afterLib;
    const afterUnknown = injectUnknownComponentPlaceholders(afterLib, meta); if(debugStages) debugStages.afterUnknown = afterUnknown;
    source = afterUnknown;

    // Compiler composant principal (SSR) – avec tentative d'auto-réparation si erreur syntaxe
    let compiled;
    try { compiled = compile(source, { generate:'ssr', hydratable:true, filename:'Component.svelte' }); }
    catch(e){
      const loc = e.start ? { line:e.start.line, column:e.start.column } : null;
      const compileErrMsg = e.message || '';
      const isSyntax = /Unexpected token|Expected token|end of input|Unexpected EOF|Expected /.test(compileErrMsg);
      const canAttemptSyntaxRepair = allowAutoRepair && !_autoRepairAttempt && isSyntax && !!process.env.OPENAI_API_KEY;
      if(canAttemptSyntaxRepair){
        heuristics.push('auto-repair-compile-syntax-hint');
        try {
          const repairResp = await fetch('/api/repair/auto', {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ filename:'Component.svelte', code: originalSource, maxPasses:1, allowCatalog:true })
          });
          const repairJson = await repairResp.json();
          if(repairJson?.success && repairJson.fixedCode && repairJson.fixedCode !== originalSource){
            autoRepairMeta = { attempted:true, success:true, passes: repairJson.passes, source: repairJson.source, mode:'compile-syntax' };
            try {
              const repairedSource = repairJson.fixedCode;
              // réapplique réécritures pour cohérence
              const repairedAfterLib = rewriteLibImports(repairedSource, meta, dependencies);
              const repairedAfterUnknown = injectUnknownComponentPlaceholders(repairedAfterLib, meta);
              source = repairedAfterUnknown;
              compiled = compile(source, { generate:'ssr', hydratable:true, filename:'Component.svelte' });
              try { autoRepairMeta.diff = { beforeHash: codeHash, changes: (repairJson.fixedCode !== originalSource ? '1+' : '0'), patchPreview: (repairJson.fixedCode.split('\n').slice(0,8).join('\n')) }; } catch {}
            } catch(reComp2){
              autoRepairMeta.compileError = reComp2.message;
              return json({ success:false, error:'Erreur compilation après auto-réparation: '+reComp2.message, position:loc, stage:'ssr-compile-repair', autoRepair:autoRepairMeta, debugStages }, { status:400 });
            }
          } else {
            autoRepairMeta = { attempted:true, success:false, reason: repairJson?.error || 'repair-no-change', mode:'compile-syntax' };
            return json({ success:false, error:'Erreur compilation: '+compileErrMsg, position:loc, stage:'ssr-compile', autoRepair:autoRepairMeta, debugStages }, { status:400 });
          }
        } catch(repairErr){
          autoRepairMeta = { attempted:true, success:false, reason: repairErr.message||'repair-exception', mode:'compile-syntax' };
          return json({ success:false, error:'Erreur compilation: '+compileErrMsg, position:loc, stage:'ssr-compile', autoRepair:autoRepairMeta, debugStages }, { status:400 });
        }
      } else {
        return json({ success:false, error:'Erreur compilation: '+compileErrMsg, position:loc, stage:'ssr-compile', debugStages }, { status:400 });
      }
    }
    const { js, css } = compiled;

    // Compiler dépendances .svelte fournies
    const depRegistry = new Map(); const depErrors=[]; const depCssBlocks=[];
    for(const [depPath, depCode] of Object.entries(dependencies)){
      if(!depPath.endsWith('.svelte')) continue;
      try {
        const c = compile(depCode, { generate:'ssr', hydratable:true, filename: depPath });
        if(c.css?.code){ const sig = c.css.code.trim(); if(!depCssBlocks.includes(sig)) depCssBlocks.push(sig); }
        const transformed = transformEsmToCjs(c.js.code);
        const factory = new Function('module','exports','require','__import', transformed + '\n;');
        depRegistry.set(depPath, { factory, exports:null });
      } catch(e){ depErrors.push({ dep: depPath, error:e.message }); }
    }

    // Build DOM version pour hydratation
    let domJsCode=null, domCssCode='', domCompileError=null;
    try { const domCompiled = compile(source, { generate:'dom', hydratable:true, filename:'Component.svelte' }); domJsCode = domCompiled.js.code; domCssCode = domCompiled.css?.code || ''; }
    catch(e){ domCompileError = e.message; }

    // Require environment
    let localRequire=null; let canRequire=false; try { localRequire = typeof require !== 'undefined' ? require : createRequire(import.meta.url); canRequire = !!localRequire; } catch{}

    let htmlBody=''; let fallbackUsed=false; let exportPick=null; let fallbackNote=null; let transformCaptured='';
    if(!canRequire){
      const esc = source.replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
      htmlBody = `<div class=\"p-3 text-xs text-gray-700\"><div class=\"font-semibold text-red-600 mb-2\">SSR indisponible (runtime)</div><pre class=\"bg-gray-100 p-2 rounded overflow-auto text-[10px]\">${esc}</pre></div>`;
    } else {
      // Évaluer SSR
      function createStub(spec){ return { default:{ render:()=> ({ html:`<span data-missing-module=\"${spec.replace(/"/g,'&quot;')}\"></span>` }) } }; }
      const transformed = transformEsmToCjs(js.code); transformCaptured = transformed;
      const rootModule = { exports:{} };
      function execFactory(factory){
        factory(rootModule, rootModule.exports, (spec)=>{ // require
          if(spec === 'svelte/internal') return localRequire('svelte/internal');
          if(depRegistry.has(spec)){ const entry = depRegistry.get(spec); if(!entry.exports){ entry.exports={}; execFactory(entry.factory); } return entry.exports; }
          if(spec.startsWith('$lib/')){
            const mapped = 'src/lib/' + spec.slice(5) + (spec.endsWith('.svelte')?'':(spec.endsWith('.js')?'':'.svelte'));
            if(depRegistry.has(mapped)){ const e = depRegistry.get(mapped); if(!e.exports){ e.exports={}; execFactory(e.factory); } return e.exports; }
            return createStub(spec);
          }
          if(spec.startsWith('./') || spec.startsWith('../')){
            for(const k of depRegistry.keys()) if(k.endsWith(spec.replace(/^\.\//,''))){ const e = depRegistry.get(k); if(!e.exports){ e.exports={}; execFactory(e.factory); } return e.exports; }
          }
          try { return localRequire(spec); } catch { return createStub(spec); }
        }, (spec)=>{ // __import pour .svelte
          if(depRegistry.has(spec)){ const e = depRegistry.get(spec); if(!e.exports){ e.exports={}; execFactory(e.factory); } return e.exports; }
          if(spec.startsWith('$lib/')){
            const mapped = 'src/lib/' + spec.slice(5) + (spec.endsWith('.svelte')?'':'.svelte');
            if(depRegistry.has(mapped)){ const e = depRegistry.get(mapped); if(!e.exports){ e.exports={}; execFactory(e.factory); } return e.exports; }
          }
          return createStub(spec);
        });
      }
      try {
        const rootFactory = new Function('module','exports','require','__import', transformed + '\n;');
        execFactory(rootFactory);
        let Component = rootModule.exports.default || rootModule.exports;
        if(!rootModule.exports.default){
          const keys = Object.keys(rootModule.exports||{});
          if(keys.length === 1){
            const only = rootModule.exports[keys[0]];
            if(only && (only.render||only.$$render)){
              Component = only; fallbackNote='single-export-promoted'; exportPick=keys[0];
            }
          }
        }
        if(Component && Component.default && (Component.default.render || Component.default.$$render)) Component = Component.default;
  if(!Component) throw new Error('export default manquant');
  heuristics.push('base-export-type=' + (typeof Component));

        // Normalisation large spectre des formes SSR possibles avant toute logique fallback (désactivée par défaut)
        if(effectiveRendererNormalization && typeof Component === 'function' && !Component.render){
          const fnSrc = Function.prototype.toString.call(Component);
          const looksLikeAritySSR = Component.length >= 3 || /\$\$result/.test(fnSrc);
          const usesRendererPush = /\$\$renderer\.push\(/.test(fnSrc);
          try {
            if(looksLikeAritySSR){
              const ssrFn = Component;
              Component = {
                render: (props)=>{
                  try {
                    const fake = { head:'', css: new Set(), title:'' };
                    const out = ssrFn(fake, props||{}, {}, {}); // signature Svelte classique
                    let html = '';
                    if(typeof out === 'string') html = out;
                    else if(out && out.html) html = out.html;
                    else if(fake.html) html = fake.html;
                    return { html };
                  } catch(e){
                    return { html:`<pre data-render-error>ssr-fn error: ${e.message.replace(/</g,'&lt;')}</pre>` };
                  }
                }
              };
              fallbackNote = (fallbackNote?fallbackNote+';':'')+'normalized-arity-ssr-fn';
              heuristics.push('normalized:arity-ssr-fn');
            } else if(usesRendererPush){
              // Plutôt que d'envelopper, on renvoie une erreur explicite pour éviter de masquer la vraie cause.
              const fnPreview = (()=>{ try { return (''+Component).slice(0,500); } catch { return 'n/a'; } })();
              const hasDollar = /(^|[^A-Za-z0-9_$])\$[\.(\[]/.test(fnPreview) || /\$\([^)]*\)/.test(fnPreview);
              const reason = hasDollar ? 'Le code SSR contient un symbole $ non défini (probable code jQuery). Aucune librairie jQuery chargée.' : 'Forme SSR non supportée (renderer.push)';
              heuristics.push('abort:renderer-push');
              if(debug){
                return json({ success:false, error: reason, meta:{ heuristics, rendererFnSnippet: fnPreview } }, { status:422 });
              } else {
                const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Erreur SSR</title></head><body><pre style="color:#b91c1c;font:12px/1.4 monospace;white-space:pre-wrap;">${reason}\n\nExtrait:\n${fnPreview.replace(/</g,'&lt;')}</pre></body></html>`;
                return new Response(html, { status:422, headers:{ 'Content-Type':'text/html; charset=utf-8','X-Compile-Mode':'ssr','X-Renderer-Push-Abort':'1' } });
              }
            }
          } catch(_e){ /* ignore heuristic error */ }
        } else if(!effectiveRendererNormalization) {
          heuristics.push('renderer-normalization-disabled');
        }

        function wrapFromBase(base){ fallbackUsed=true; return { render:(p)=>{ try { return { html: base.$$render({}, p||{}, {}, {}) }; } catch(e){ return { html:`<pre data-render-error>$$render error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } }; }

        // Auto-réparation opportuniste: si erreur typique "X is not a function" sur un composant catalogue référencé
        function needsAutoRepair(errMsg){
          return /is not a function/.test(errMsg||'');
        }

        // Si strict: on refuse tout fallback si pas de Component.render à ce stade
        if(strict && typeof Component.render !== 'function'){
          const shapeDesc = Object.keys(Component||{}).slice(0,5).join(',');
          const reason = 'Aucun render() après normalisation (shape='+(typeof Component)+ (shapeDesc? ' keys='+shapeDesc:'') + ') en mode strict';
          heuristics.push('strict-abort');
          if(debug){
            return json({ success:false, error: reason, meta:{ heuristics, strict:true } }, { status:422, headers:{ 'X-Compile-Mode':'ssr', 'X-Strict':'1', 'X-Compile-Error-Reason':'no-render-strict' } });
          } else {
            const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Erreur SSR strict</title></head><body><pre style="color:#b91c1c;font:12px/1.4 monospace;white-space:pre-wrap;">${reason}</pre></body></html>`;
            return new Response(html, { status:422, headers:{ 'Content-Type':'text/html; charset=utf-8','X-Compile-Mode':'ssr','X-Strict':'1','X-Compile-Error-Reason':'no-render-strict' } });
          }
        }

  // Phase fallback (non-strict) seulement si après normalisation aucune méthode render (désactivée en mode pure)
  if(!pure && typeof Component.render !== 'function'){
          if(Component.$$render){ Component = wrapFromBase(Component); }
          else if(Component.prototype && Component.prototype.$$render){ const proto = Component.prototype; fallbackUsed=true; Component = { render:(p)=>{ try { return { html: proto.$$render({}, p||{}, {}, {}) }; } catch(e){ return { html:`<pre data-render-error>proto $$render error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } }; }
          else if(typeof Component === 'function'){
            try {
              const test = Component({});
              if(test){
                if(typeof test === 'string'){ fallbackUsed=true; Component = { render:()=>({ html:test }) }; }
                else if(test.html){ fallbackUsed=true; Component = { render:()=>({ html:test.html }) }; }
                else if(test.$$render){ Component = wrapFromBase(test); }
              }
            } catch {}
            if(typeof Component.render !== 'function' && Component.length >=3){
              const fn = Component; fallbackUsed=true; Component = { render:(p)=>{ try { const fake={head:'', css:new Set(), html:'', title:''}; const out = fn(fake, p||{}, {}, {}); if(typeof out==='string') return { html:out }; if(out && out.html) return { html: out.html }; if(fake.html) return { html: fake.html }; return { html:'<!-- empty SSR function output -->' }; } catch(e){ return { html:`<pre data-render-error>arity-fn error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } };
            }
            // Heuristique supplémentaire: essayer de l'envelopper via create_ssr_component si disponible
            if(typeof Component.render !== 'function'){
              try {
                const { create_ssr_component } = localRequire('svelte/internal');
                if(typeof create_ssr_component === 'function'){
                  const created = create_ssr_component(($$result, $$props, $$bindings, slots)=>{
                    try { return Component($$props||{}); } catch(e){ return `<pre data-render-error>create_ssr_component inner error: ${e.message.replace(/</g,'&lt;')}</pre>`; }
                  });
                  if(created && created.$$render){
                    Component = wrapFromBase(created);
                    fallbackNote = (fallbackNote? fallbackNote+';':'') + 'wrapped-via-create_ssr_component';
                  }
                }
              } catch(_e){ /* ignore */ }
            }
          }
          if(typeof Component.render !== 'function'){
            const shape = typeof Component; fallbackUsed=true;
            const fnRef = Component;
            Component = { render:(p)=>{ try { if(typeof fnRef==='function'){ let r; try { r = fnRef(p||{}); } catch{} if(r){ if(typeof r==='string') return { html:r }; if(r && r.html) return { html:r.html }; if(r && r.$$render){ try { return { html: r.$$render({}, p||{}, {}, {}) }; } catch(e){ return { html:`<pre data-render-error>inner $$render error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } } } return { html:`<div data-fallback-wrapper class=\"text-xs text-amber-600 font-mono p-2 border border-dashed border-amber-400 rounded bg-amber-50\">SSR fallback wrapper (shape=${shape})</div>` }; } catch(e){ return { html:`<pre data-render-error>ultimate fallback error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } };
          }
        }

        // Props init heuristique
        const propRegex = /export\s+let\s+([A-Za-z0-9_]+)(\s*=\s*([^;]+))?;/g; let pm; const initialProps={};
        while((pm = propRegex.exec(source))){ const name = pm[1]; const raw = pm[3]; if(raw){ const t=raw.trim(); try { if(/^["'`].*["'`]$/.test(t)) initialProps[name]=t.slice(1,-1); else if(/^(true|false)$/i.test(t)) initialProps[name]=t.toLowerCase()==='true'; else if(/^[0-9]+(\.[0-9]+)?$/.test(t)) initialProps[name]=Number(t); else if(/^[\[{].*[\]}]$/.test(t)) { try { initialProps[name]=JSON.parse(t); } catch{} } else initialProps[name]=null; } catch{ initialProps[name]=null; } } else { initialProps[name]=null; } }
        let rendered;
        try {
          rendered = Component.render ? Component.render(initialProps) : { html:'' };
        } catch(execErr){
          const msg = execErr.message||'';
          if(needsAutoRepair(msg)){
            rendered = { html:`<div class=\"p-3 text-xs text-amber-700 bg-amber-50 border border-amber-300 rounded\">Tentative: composant non exécutable (${msg}). Vérifie les imports ou régénère le fichier concerné.</div>` };
            heuristics.push('auto-repair-hint');
          } else {
            rendered = { html:`<pre data-render-error>render error: ${msg.replace(/</g,'&lt;')}</pre>` };
          }
        }
        // === Tentative Auto-Repair (mode B) ===
        // Conditions: heuristique auto-repair-hint OU fallback + pas encore tenté + autorisé + clé OpenAI disponible
        const shouldAttemptRepair = allowAutoRepair && !_autoRepairAttempt && (heuristics.includes('auto-repair-hint') || (typeof Component.render !== 'function')) && !!process.env.OPENAI_API_KEY;
        if(shouldAttemptRepair){
          try {
            heuristics.push('auto-repair-pass-start');
            const repairResp = await fetch('/api/repair/auto', {
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: JSON.stringify({ filename:'Component.svelte', code: originalSource, maxPasses: 1, allowCatalog: true })
            });
            const repairJson = await repairResp.json();
            if(repairJson?.success && repairJson.fixedCode && repairJson.fixedCode.trim() && repairJson.fixedCode !== originalSource){
              autoRepairMeta = { attempted:true, success:true, passes: repairJson.passes, source: repairJson.source };
              // Recompiler à partir du code réparé (une seule passe) — réutilise pipeline simplifiée
              let repairedSource = repairJson.fixedCode;
              // On applique les mêmes réécritures lib/unknown pour cohérence
              const repairedAfterLib = rewriteLibImports(repairedSource, meta, dependencies);
              const repairedAfterUnknown = injectUnknownComponentPlaceholders(repairedAfterLib, meta);
              repairedSource = repairedAfterUnknown;
              let repairedCompiled;
              try { repairedCompiled = compile(repairedSource, { generate:'ssr', hydratable:true, filename:'Component.svelte' }); } catch(reCompErr){
                autoRepairMeta.compileError = reCompErr.message;
              }
              if(repairedCompiled){
                try {
                  const transformed2 = transformEsmToCjs(repairedCompiled.js.code);
                  const m2 = { exports:{} };
                  const f2 = new Function('module','exports','require','__import', transformed2 + '\n;');
                  // ré-exécution minimaliste (sans dép .svelte recompile car invariantes)
                  f2(m2, m2.exports, (spec)=>{
                    if(spec === 'svelte/internal') return localRequire('svelte/internal');
                    try { return localRequire(spec); } catch { return { default:{ render:()=>({ html:`<span data-missing-module=\"${spec}\"></span>` }) } }; }
                  }, ()=>({ default:{ render:()=>({ html:'<span data-import-stub></span>' }) } }));
                  let C2 = m2.exports.default || m2.exports;
                  if(C2 && C2.default && (C2.default.render||C2.default.$$render)) C2 = C2.default;
                  if(C2 && !C2.render && C2.$$render){ C2 = { render:(p)=>({ html:C2.$$render({}, p||{}, {}, {}) }) }; }
                  let out2 = '';
                  try { out2 = (C2 && C2.render) ? C2.render({}).html : ''; } catch(e){ out2 = `<pre data-render-error>post-repair render error: ${e.message.replace(/</g,'&lt;')}</pre>`; }
                  // Remplacer htmlBody par la version réparée seulement si non vide
                  if(out2){
                    rendered.html = out2 + `<div data-auto-repair-note class=\"hidden\">auto-repair applied</div>`;
                    heuristics.push('auto-repair-success');
                    try { autoRepairMeta.diff = { patchPreview: repairedSource.split('\n').slice(0,8).join('\n') }; } catch {}
                  } else {
                    heuristics.push('auto-repair-empty-output');
                  }
                } catch(reEvalErr){
                  autoRepairMeta.evalError = reEvalErr.message;
                  heuristics.push('auto-repair-eval-error');
                }
              }
            } else {
              autoRepairMeta = { attempted:true, success:false, reason: repairJson?.error || 'repair-no-change' };
              heuristics.push('auto-repair-no-change');
            }
          } catch(repairErr){
            autoRepairMeta = { attempted:true, success:false, reason: repairErr.message || 'repair-exception' };
            heuristics.push('auto-repair-exception');
          }
        } else if(allowAutoRepair && !_autoRepairAttempt && !process.env.OPENAI_API_KEY && heuristics.includes('auto-repair-hint')) {
          autoRepairMeta = { attempted:false, success:false, reason:'missing-openai-key' };
          heuristics.push('auto-repair-skip-no-key');
        }
        htmlBody = rendered.html;
        // Marquer explicitement fallback dans heuristics si utilisé
        try { if(fallbackUsed && !heuristics.includes('fallback-used')) heuristics.push('fallback-used'); } catch {}
        globalThis.__LAST_COMPONENT_PROPS__ = initialProps;
        globalThis.__LAST_SSR_FALLBACK__ = fallbackUsed || (typeof Component.render !== 'function');
        globalThis.__LAST_SSR_EXPORT_PICK__ = exportPick;
        globalThis.__LAST_SSR_FALLBACK_NOTE__ = fallbackNote;
        globalThis.__LAST_SSR_TRANSFORM__ = transformCaptured;
        globalThis.__LAST_SSR_HEURISTICS__ = heuristics;
      } catch(e){
        const msg = e.message||'';
        const suggestion = /\$ is not defined/.test(msg) ? 'Possible code jQuery non stub – activer allowJQueryTransform ou retirer usages.' : null;
        return json({ success:false, error:'Évaluation impossible: '+msg, stage:'ssr-eval', suggestion, heuristics }, { status:/export default manquant/.test(msg)?422:500 });
      }
    }

    // Meta & HTML final
    const metaParts = [
      `req=${globalThis.__COMP_COMPONENT_COUNT}`,
      `hash=${codeHash}`,
      `mode=${canRequire?'ssr':'edge'}`,
      `deps=${depRegistry.size}`
    ];
    if(globalThis.__LAST_SSR_FALLBACK__) metaParts.push('fallback=1');
    if(meta.missingComponents.length) metaParts.push('missing='+meta.missingComponents.length);
    if(meta.libStubs.length) metaParts.push('libstubs='+meta.libStubs.length);
    if(depErrors.length) metaParts.push('deperrors='+depErrors.length);
    if(depCssBlocks.length) metaParts.push('depCss='+depCssBlocks.length);
    if(autoRepairMeta && autoRepairMeta.success) metaParts.push('autoRepair=1'); else if(autoRepairMeta && autoRepairMeta.attempted) metaParts.push('autoRepair=0');
    const metaComment = `<!--component-compile ${metaParts.join(' ')}-->`+
      (meta.missingComponents.length ? `\n<!--missing-components:${meta.missingComponents.join(',')}-->`:'')+
      (meta.libStubs.length ? `\n<!--missing-lib-components:${meta.libStubs.join(',')}-->`:'')+
      (depErrors.length ? `\n<!--dependency-errors:${depErrors.map(d=> d.dep+':'+d.error).join('|')}-->`:'');

    // Import map étendu: couvrir sous-chemins svelte/internal/* requis par hydratation (ex: disclose-version)
    // Import map: certaines CDN jsdelivr renvoient 404 sur sous chemins internal/flags/legacy.
    // On bascule vers unpkg (plus tolérant) et on ajoute un fallback dynamique si le fetch échoue côté client.
    const needsInternal = domJsCode && /svelte\/internal/.test(domJsCode);
    let importMap = '';
    if(needsInternal){
      const fsMod = await import('node:fs');
      let internalClient=''; let internalCore='';
      try { internalClient = fsMod.readFileSync('node_modules/svelte/internal/client.js','utf-8'); } catch{ internalClient='export const noop=()=>{};'; }
      try { internalCore = fsMod.readFileSync('node_modules/svelte/internal/index.js','utf-8'); } catch{ internalCore='export const noop=()=>{};'; }
      const map = { imports: {
        'svelte/internal/client': 'data:application/javascript;base64,'+Buffer.from(internalClient,'utf-8').toString('base64'),
        'svelte/internal': 'data:application/javascript;base64,'+Buffer.from(internalCore,'utf-8').toString('base64')
      }};
      try {
        // Détecter sous-modules utilisés (ex: disclose-version, flags/legacy)
        const submods = Array.from(new Set([...(domJsCode||'').matchAll(/['"]svelte\/internal\/(.+?)['"]/g)].map(m=> m[1])));
        for(const sm of submods){
          const key = 'svelte/internal/'+sm;
            if(!map.imports[key]){
              try {
                const code = fsMod.readFileSync('node_modules/svelte/internal/'+sm,'utf-8');
                map.imports[key] = 'data:application/javascript;base64,'+Buffer.from(code,'utf-8').toString('base64');
              } catch { /* ignore missing */ }
            }
        }
      } catch { /* ignore parse errors */ }
      importMap = `\n<script type="importmap">${JSON.stringify(map)}</script>`;
    }
    const wrapStart = canRequire ? '<div id="__component_root">' : '<div id="__component_root" data-no-ssr="1">';
    const depCssTag = depCssBlocks.length ? `\n<style data-deps-css="1">${depCssBlocks.join('\n/* --- */\n')}</style>` : '';
    let hydrationScript='';
    if(canRequire && domJsCode){
      const b64 = Buffer.from(domJsCode,'utf-8').toString('base64');
      const propsB64 = Buffer.from(JSON.stringify(globalThis.__LAST_COMPONENT_PROPS__||{}),'utf-8').toString('base64');
  hydrationScript = `<script>(function(){const ROOT_ID='__component_root';let __hydrationSignal=0;function post(type,msg){try{parent&&parent.postMessage&&parent.postMessage({type,message:msg},'*');}catch(_e){}}function surface(err,label){console.error(label,err);var r=document.getElementById(ROOT_ID);if(r){r.setAttribute('data-hydration-error', err.message||String(err));r.setAttribute('data-hydration-status','error');r.innerHTML='<pre style=\"color:#b91c1c;font:11px/1.4 monospace;white-space:pre-wrap;padding:8px;border:1px solid #fca5a5;background:#fef2f2;border-radius:4px;\">Hydration error: '+(err.message||String(err)).replace(/</g,'&lt;')+'</pre>';document.dispatchEvent(new CustomEvent('component-hydration-error',{detail:{message:err.message,label}}));post('hydration-error',err.message||String(err));}}
setTimeout(function(){if(!__hydrationSignal){post('hydration-pending','Hydratation non confirmée');}},3000);
try{const js=atob('${b64}');const blob=new Blob([js],{type:'text/javascript'});const u=URL.createObjectURL(blob);const props=JSON.parse(atob('${propsB64}'));
import(u).then(m=>{try{const root=document.getElementById(ROOT_ID);if(!root) throw new Error('Root introuvable');let C=m.default||m; if(!C) throw new Error('Aucun export default trouvé'); let mounted=false; const looksLikeClass = typeof C === 'function' && C.prototype && (C.prototype.$destroy || C.prototype.$set); if(looksLikeClass){ try { new C({ target:root, hydrate:true, props }); mounted=true; } catch(ctorErr){ throw ctorErr; } } else if(typeof C === 'function'){ try { C(root, props); mounted=true; } catch(fnErr){ try { C(root); mounted=true; } catch(fnErr2){ throw fnErr; } } } else if(C && typeof C.mount==='function'){ C.mount(root); mounted=true; } if(!mounted) throw new Error('Impossible de monter export'); root.setAttribute('data-hydration-status','ok');__hydrationSignal=1;post('hydration-ok','ok'); }catch(e){ surface(e,'Hydration mount error'); }}).catch(e=>surface(e,'Hydration import fail'));
window.addEventListener('unhandledrejection',ev=>surface(ev.reason||ev,'Unhandled promise rejection'));
}catch(e){surface(e,'Hydration bootstrap error');}})();</script>`;
    } else if(!canRequire && domCompileError){
      hydrationScript = `<!-- dom compile error: ${domCompileError} -->`;
    }
  // Pour production: on pourrait retirer le CDN Tailwind; on garde un flag simple (pas d'env server ici, heuristique: ajouter data-cdn-warning pour debug)
  const tailwindLink = '<link rel="stylesheet" href="/tailwind.css" data-local="1" />';
  const html = `<!DOCTYPE html><html><head><meta charset='utf-8'>\n<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />\n${tailwindLink}${importMap}${depCssTag}${ css?.code ? `\n<style>${css.code}</style>`:'' }${ !css?.code && domCssCode ? `\n<style>${domCssCode}</style>`:''}</head><body class="p-4">${metaComment}\n${wrapStart}${htmlBody}</div>${hydrationScript}</body></html>`;

    if(debug){
      if(debugStages) debugStages.finalSource = source;
  const hs = globalThis.__LAST_SSR_HEURISTICS__||[];
      const durationMs = Date.now()-started;
      const r = json({ success:true, html, durationMs, meta:{ missing:meta.missingComponents, libStubs:meta.libStubs, depCount:depRegistry.size, depErrors, depCssBlocks:depCssBlocks.length, mode: canRequire?'ssr':'edge', fallbackUsed: !!globalThis.__LAST_SSR_FALLBACK__, exportPick: globalThis.__LAST_SSR_EXPORT_PICK__||null, fallbackNote: globalThis.__LAST_SSR_FALLBACK_NOTE__||null, heuristics: hs, heuristicPath: hs.join(' > '), strict, autoRepair: autoRepairMeta }, ssrJs: js?.code || null, ssrTransformed: transformCaptured, domJs: domJsCode || null, css: css?.code || '', depCss: depCssBlocks, dependencies: Array.from(depRegistry.keys()), debugStages });
      r.headers.set('X-Compile-Mode','ssr');
      r.headers.set('X-Fallback-Used', (globalThis.__LAST_SSR_FALLBACK__? '1':'0'));
      r.headers.set('X-Compile-Duration', String(durationMs));
      if(strict) r.headers.set('X-Strict','1');
      return r;
    }

    const csp = [
      "default-src 'none'",
      "style-src 'unsafe-inline' https://cdnjs.cloudflare.com 'self'",
      "script-src 'unsafe-inline' blob:",
      "font-src https://cdnjs.cloudflare.com",
      "img-src data: blob:",
      "connect-src 'none'",
      "frame-ancestors 'none'"
    ].join('; ');
  const resDuration = Date.now()-started;
  const res = new Response(html, { headers: { 'Content-Type':'text/html; charset=utf-8', 'X-Compile-Mode':'ssr', 'X-Fallback-Used': (globalThis.__LAST_SSR_FALLBACK__? '1':'0'), 'X-Compile-Duration': String(resDuration), 'Cache-Control':'no-store', 'Content-Security-Policy': csp, ...(strict? { 'X-Strict':'1'} : {}) } });
    return res;
  } catch(e){
    console.error('compile/component fatal', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

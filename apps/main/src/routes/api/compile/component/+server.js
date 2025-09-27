import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { createRequire } from 'module';

// Endpoint: compile & SSR un snippet Svelte (avec dépendances .svelte fournies) + hydratation.
// Body attendu: { code: string, dependencies?: { [path:string]: string }, debug?: boolean }
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { code, dependencies = {}, debug = false } = body || {};
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    if(typeof globalThis.__COMP_COMPONENT_COUNT === 'undefined') globalThis.__COMP_COMPONENT_COUNT = 0;
    globalThis.__COMP_COMPONENT_COUNT++;

    const codeHash = await (async () => {
      try { const { createHash } = await import('crypto'); return createHash('sha1').update(code).digest('hex').slice(0,12); } catch { return 'na'; }
    })();

    const originalSource = code;
    let source = code;

    // Heuristique: ajouter un <script> minimal si contenu simple sans script pour permettre export de props.
  // Détection heuristique très simple de syntaxe Svelte; on évite les accolades brutes non échappées dans la RegExp.
  const hasSvelteSyntax = /<script[\s>]|\{#if|\{#each|on:[a-zA-Z]+=/u.test(source);
  if(!hasSvelteSyntax && !/<script[\s>]/.test(source)) {
      source = `<script>export let props = {};</script>\n${source}`;
    }

    const meta = { missingComponents: [], libStubs: [], depProvided: Object.keys(dependencies).length };
    const debugStages = debug ? { original: originalSource } : null;

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

    // Compiler composant principal (SSR)
    let compiled;
    try { compiled = compile(source, { generate:'ssr', hydratable:true, filename:'Component.svelte' }); }
    catch(e){
      const loc = e.start ? { line:e.start.line, column:e.start.column } : null;
      return json({ success:false, error:'Erreur compilation: '+e.message, position:loc, stage:'ssr-compile', debugStages }, { status:400 });
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

        function wrapFromBase(base){ fallbackUsed=true; return { render:(p)=>{ try { return { html: base.$$render({}, p||{}, {}, {}) }; } catch(e){ return { html:`<pre data-render-error>$$render error: ${e.message.replace(/</g,'&lt;')}</pre>` }; } } }; }

        if(typeof Component.render !== 'function'){
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
        const rendered = Component.render ? Component.render(initialProps) : { html:'' };
        htmlBody = rendered.html;
        globalThis.__LAST_COMPONENT_PROPS__ = initialProps;
        globalThis.__LAST_SSR_FALLBACK__ = fallbackUsed || (typeof Component.render !== 'function');
        globalThis.__LAST_SSR_EXPORT_PICK__ = exportPick;
        globalThis.__LAST_SSR_FALLBACK_NOTE__ = fallbackNote;
        globalThis.__LAST_SSR_TRANSFORM__ = transformCaptured;
      } catch(e){
        return json({ success:false, error:'Évaluation impossible: '+e.message }, { status:500 });
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
    const metaComment = `<!--component-compile ${metaParts.join(' ')}-->`+
      (meta.missingComponents.length ? `\n<!--missing-components:${meta.missingComponents.join(',')}-->`:'')+
      (meta.libStubs.length ? `\n<!--missing-lib-components:${meta.libStubs.join(',')}-->`:'')+
      (depErrors.length ? `\n<!--dependency-errors:${depErrors.map(d=> d.dep+':'+d.error).join('|')}-->`:'');

    const importMap = domJsCode && /svelte\/internal/.test(domJsCode) ? `\n<script type="importmap">{"imports":{"svelte/internal":"https://cdn.jsdelivr.net/npm/svelte@4.2.0/internal/index.js"}}</script>` : '';
    const wrapStart = canRequire ? '<div id="__component_root">' : '<div id="__component_root" data-no-ssr="1">';
    const depCssTag = depCssBlocks.length ? `\n<style data-deps-css="1">${depCssBlocks.join('\n/* --- */\n')}</style>` : '';
    let hydrationScript='';
    if(canRequire && domJsCode){
      const b64 = Buffer.from(domJsCode,'utf-8').toString('base64');
      const propsB64 = Buffer.from(JSON.stringify(globalThis.__LAST_COMPONENT_PROPS__||{}),'utf-8').toString('base64');
      hydrationScript = `<script>(function(){try{const js=atob('${b64}');const blob=new Blob([js],{type:'text/javascript'});const u=URL.createObjectURL(blob);const props=JSON.parse(atob('${propsB64}'));import(u).then(m=>{const C=m.default||m;const root=document.getElementById('__component_root');if(root){new C({target:root, hydrate:true, props});}}).catch(e=>console.warn('Hydration fail',e));}catch(e){console.warn('Hydration bootstrap error',e);}})();</script>`;
    } else if(!canRequire && domCompileError){
      hydrationScript = `<!-- dom compile error: ${domCompileError} -->`;
    }
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'>\n<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />\n<script src="https://cdn.tailwindcss.com"></script>${importMap}${depCssTag}${ css?.code ? `\n<style>${css.code}</style>`:'' }${ !css?.code && domCssCode ? `\n<style>${domCssCode}</style>`:''}</head><body class="p-4">${metaComment}\n${wrapStart}${htmlBody}</div>${hydrationScript}</body></html>`;

    if(debug){ if(debugStages) debugStages.finalSource = source; return json({ success:true, html, meta:{ missing:meta.missingComponents, libStubs:meta.libStubs, depCount:depRegistry.size, depErrors, depCssBlocks:depCssBlocks.length, mode: canRequire?'ssr':'edge', fallbackUsed: !!globalThis.__LAST_SSR_FALLBACK__, exportPick: globalThis.__LAST_SSR_EXPORT_PICK__||null, fallbackNote: globalThis.__LAST_SSR_FALLBACK_NOTE__||null }, ssrJs: js?.code || null, ssrTransformed: transformCaptured, domJs: domJsCode || null, css: css?.code || '', depCss: depCssBlocks, dependencies: Array.from(depRegistry.keys()), debugStages }); }

    return new Response(html, { headers: { 'Content-Type':'text/html; charset=utf-8' } });
  } catch(e){
    console.error('compile/component fatal', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

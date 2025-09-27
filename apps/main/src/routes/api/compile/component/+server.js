import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { createRequire } from 'module';

// Endpoint minimal pour rendre un fichier Svelte (ou simple markup) côté serveur en HTML statique.
// Body: { code: string }
// Réponse: { success, html, css }
export async function POST({ request }) {
  try {
    const { code } = await request.json();
    if(!code || !code.trim()) return json({ success:false, error:'Code requis' }, { status:400 });
    if(typeof globalThis.__COMP_COMPONENT_COUNT === 'undefined') globalThis.__COMP_COMPONENT_COUNT = 0;
    globalThis.__COMP_COMPONENT_COUNT++;
    const codeHash = await (async ()=>{
      try { const { createHash } = await import('crypto'); return createHash('sha1').update(code).digest('hex').slice(0,12); } catch(_e){ return 'na'; }
    })();

    // Injecter placeholders pour composants non importés (ex: <ButtonRed />) afin d'éviter SSR vide/bloquant.
    function injectUnknownComponentPlaceholders(src, meta){
      // Match balises capitalisées sans import correspondant. Heuristique simple.
      const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b[^>]*>/g; const found = new Set(); let m;
      while((m=tagRegex.exec(src))){ found.add(m[1]); }
      if(!found.size) return src;
      // Si un composant est déjà importé, on le laisse. On cherche lignes import ... from '...'
      const imported = new Set();
      const importRegex = /import\s+([^;]+)from\s+['"][^'"]+['"]/g; let im;
      while((im = importRegex.exec(src))){
        const names = im[1].split(/[,{}\s]/).map(s=> s.trim()).filter(Boolean);
        names.forEach(n=> imported.add(n.replace(/as.*/,'')));
      }
      const toStub = [...found].filter(n=> !imported.has(n));
      if(!toStub.length) return src;
      meta.missingComponents = toStub;
      // Skeleton placeholder markup (accessible + identifiable)
      const skeletonFor = (name)=> {
        const label = name.replace(/([a-z])([A-Z])/g,'$1 $2');
        return `<div class=\"missing-component skeleton border border-dashed border-gray-300 rounded bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-gray-400 text-[10px] inline-flex items-center justify-center px-3 py-1 gap-1 animate-pulse\" data-missing-component=\"${name}\" title=\"Stub auto-généré pour ${label}\">`+
          `<span class=\"w-2 h-2 rounded-full bg-gray-300/60 dark:bg-gray-600 animate-ping\"></span>`+
          `<span class=\"font-medium tracking-wide\">${label}</span>`+
          `</div>`;
      };
      const stubLines = toStub.map(n=> `const ${n} = ({children})=>({ $$render:()=> ${JSON.stringify(skeletonFor(n))} });`);
      // Préprend un <script> ou en crée un
      if(/<script[>\s]/.test(src)){
        return src.replace(/<script[>\s][^>]*>/, m=> m + '\n' + stubLines.join('\n'));
      } else {
        return `<script>\n${stubLines.join('\n')}\n</script>\n` + src;
      }
    }

    // Si c'est juste du markup sans balises <script>/<template>, on l'encapsule dans un composant.
    let source = code;
    const hasSvelteSyntax = /<script[\s>]|{#if|{#each|on:click=/.test(code);
    if(!/</.test(code.trim().slice(0,40))){
      // probablement juste texte -> wrap div
      source = `<div>${code}</div>`;
    }
    // Ajouter un wrapper si le code ne contient pas de <script> et ne commence pas par <>
    if(!hasSvelteSyntax && !/<script[\s>]/.test(code)){
      source = `<script>export let props = {};</script>\n${code}`;
    }

  const meta = { missingComponents: [] };
  source = injectUnknownComponentPlaceholders(source, meta);
  let compiled;
    try {
  compiled = compile(source, { generate: 'ssr', hydratable: true, format:'cjs' });
    } catch (e) {
      return json({ success:false, error:'Erreur compilation: '+e.message }, { status:400 });
    }

  const { js, css } = compiled || {};
    // Préparer une version DOM pour hydratation (format ESM pour import dynamique)
    let domJsCode = null; let domCompileError = null; let domCssCode='';
    try {
      const domCompiled = compile(source, { generate:'dom', hydratable:true, format:'esm' });
      domJsCode = domCompiled.js.code; domCssCode = domCompiled.css?.code || '';
    } catch(e){ domCompileError = e.message; }
    // Création d'un require compatible dans un contexte ESM
    let localRequire = null; let canRequire = false;
    try { localRequire = typeof require !== 'undefined' ? require : createRequire(import.meta.url); canRequire = !!localRequire; } catch(_e){ canRequire=false; }
    let htmlBody = '';
    if(!canRequire){
      // Edge/runtime sans require: renvoyer placeholder + code source échappé minimal
      const escaped = source.replace(/[&<>]/g, ch=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
      htmlBody = `<div class=\"p-4 text-xs text-gray-700\"><div class=\"mb-2 font-semibold text-red-600\">SSR non disponible (runtime sans require)</div><pre class=\"text-[10px] bg-gray-100 p-2 rounded overflow-auto\">${escaped}</pre></div>`;
    } else {
      // Évaluation SSR classique
      let Component;
      try {
        // custom require qui stub les modules manquants (ex: alias Svelte non résolus)
        function createStub(spec){
          return { default: { render: () => ({ html: `<span data-missing-module=\"${spec.replace(/"/g,'&quot;')}\"></span>` }) } };
        }
        const moduleFunc = new Function('module','exports','require', js.code);
        const module = { exports: {} };
        moduleFunc(module, module.exports, (name)=>{
          if(name === 'svelte/internal') return localRequire('svelte/internal');
          try { return localRequire(name); } catch(_e){ return createStub(name); }
        });
        Component = module.exports.default || module.exports;
        if(!Component || typeof Component.render !== 'function') throw new Error('render() absent');
      } catch(e){
        return json({ success:false, error:'Évaluation impossible: '+e.message }, { status:500 });
      }
      try {
        // Extraction naïve des props exportées (export let foo = 123;)
        const propRegex = /export\s+let\s+([A-Za-z0-9_]+)(\s*=\s*([^;]+))?;/g; let pm; const initialProps={};
        while((pm = propRegex.exec(source))){
          const name = pm[1]; const raw = pm[3];
          if(raw){
            try {
              // Sécuriser évaluation de littéraux simples
              if(/^['"`].*['"`]$/.test(raw.trim())) initialProps[name] = raw.trim().slice(1,-1);
              else if(/^(true|false)$/i.test(raw.trim())) initialProps[name] = raw.trim().toLowerCase()==='true';
              else if(/^[0-9]+(\.[0-9]+)?$/.test(raw.trim())) initialProps[name] = Number(raw.trim());
              else if(/^[\[{].*[\]}]$/.test(raw.trim())) { try { initialProps[name] = JSON.parse(raw.trim()); } catch(_e){ /* ignore */ } }
            } catch(_e){ /* ignore parse prop */ }
          } else {
            initialProps[name] = null;
          }
        }
        const rendered = Component.render ? Component.render(initialProps) : { html: '' };
        htmlBody = rendered.html;
        // Stocker initialProps pour hydratation
        globalThis.__LAST_COMPONENT_PROPS__ = initialProps;
      } catch(e){
        return json({ success:false, error:'Rendu serveur échoué: '+e.message }, { status:500 });
      }
    }

    const metaParts = [
      `req=${globalThis.__COMP_COMPONENT_COUNT}`,
      `hash=${codeHash}`,
      `ts=${Date.now()}`,
      `mode=${canRequire?'ssr':'edge-fallback'}`
    ];
    if(meta.missingComponents?.length){
      metaParts.push('missing='+meta.missingComponents.join('|'));
    }
    const metaComment = `<!--component-compile ${metaParts.join(' ')}-->` + (meta.missingComponents?.length ? `\n<!--missing-components:${meta.missingComponents.join(',')}-->` : '');
    // Script d'hydratation si SSR OK et domJsCode dispo
    let hydrationScript = '';
    if(canRequire && domJsCode){
      // Encodage base64 pour import dynamique inline
      const b64 = Buffer.from(domJsCode, 'utf-8').toString('base64');
      const propsB64 = Buffer.from(JSON.stringify(globalThis.__LAST_COMPONENT_PROPS__||{}),'utf-8').toString('base64');
      hydrationScript = `<script>(function(){try{const js=atob('${b64}');const blob=new Blob([js],{type:'text/javascript'});const u=URL.createObjectURL(blob);const props=JSON.parse(atob('${propsB64}'));import(u).then(m=>{const C=m.default||m;const root=document.getElementById('__component_root');if(root){new C({target:root, hydrate:true, props});}}).catch(e=>console.warn('Hydration fail',e));}catch(e){console.warn('Hydration bootstrap error',e);}})();</script>`;
    } else if(!canRequire && domCompileError){
      hydrationScript = `<!-- dom compile error: ${domCompileError} -->`;
    }
    const wrapStart = canRequire ? '<div id="__component_root">' : '<div id="__component_root" data-no-ssr="1">';
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'>\n<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css\" />\n<script src=\"https://cdn.tailwindcss.com\"></script>${ css?.code ? `\n<style>${css.code}</style>` : '' }${ domCssCode && !css?.code ? `\n<style>${domCssCode}</style>`:''}</head><body class=\"p-4\">${metaComment}\n${wrapStart}${htmlBody}</div>${hydrationScript}</body></html>`;
    return new Response(html, { headers: { 'Content-Type':'text/html; charset=utf-8' } });
  } catch (e) {
    console.error('compile/component error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

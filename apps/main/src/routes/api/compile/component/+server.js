import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

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

    let compiled;
    try {
      compiled = compile(source, { generate: 'ssr', hydratable: false });
    } catch (e) {
      return json({ success:false, error:'Erreur compilation: '+e.message }, { status:400 });
    }

    const { js, css } = compiled || {};
    const canRequire = typeof require !== 'undefined';
    let htmlBody = '';
    if(!canRequire){
      // Edge/runtime sans require: renvoyer placeholder + code source échappé minimal
      const escaped = source.replace(/[&<>]/g, ch=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
      htmlBody = `<div class=\"p-4 text-xs text-gray-700\"><div class=\"mb-2 font-semibold text-red-600\">SSR non disponible (runtime sans require)</div><pre class=\"text-[10px] bg-gray-100 p-2 rounded overflow-auto\">${escaped}</pre></div>`;
    } else {
      // Évaluation SSR classique
      let Component;
      try {
        const moduleFunc = new Function('require','module','exports', js.code);
        const module = { exports: {} };
        moduleFunc((name)=>{
          if(name === 'svelte/internal') return require('svelte/internal');
          return require(name);
        }, module, module.exports);
        Component = module.exports.default || module.exports;
        if(!Component || typeof Component.render !== 'function') throw new Error('render() absent');
      } catch(e){
        return json({ success:false, error:'Évaluation impossible: '+e.message }, { status:500 });
      }
      try {
        const rendered = Component.render ? Component.render({}) : { html: '' };
        htmlBody = rendered.html;
      } catch(e){
        return json({ success:false, error:'Rendu serveur échoué: '+e.message }, { status:500 });
      }
    }

    const metaComment = `<!--component-compile req=${globalThis.__COMP_COMPONENT_COUNT} hash=${codeHash} ts=${Date.now()} mode=${canRequire?'ssr':'edge-fallback'}-->`;
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'>\n<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css\" />\n<script src=\"https://cdn.tailwindcss.com\"></script>${ css?.code ? `\n<style>${css.code}</style>` : '' }</head><body class=\"p-4\">${metaComment}\n${htmlBody}</body></html>`;
    return new Response(html, { headers: { 'Content-Type':'text/html; charset=utf-8' } });
  } catch (e) {
    console.error('compile/component error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

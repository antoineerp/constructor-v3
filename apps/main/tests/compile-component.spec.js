import { describe, it, expect } from 'vitest';
import { compile } from 'svelte/compiler';

// Tests unitaires légers sur la logique heuristique côté serveur seraient idéalement en testant l'endpoint.
// Ici on cible quelques snapshots de formes exportées simulant les cas déjà traités pour éviter régression de fallback.
// NOTE: Sans exécuter le +server.js directement (car dépendances SvelteKit), on va dupliquer la fonction de normalisation minimale.

function normalizeComponentShape(mod){
  // logiquement inspiré de /api/compile/component heuristiques essentielles
  let Component = mod.default || mod;
  if(Component && Component.default && (Component.default.render || Component.default.$$render)) Component = Component.default;
  if(typeof Component === 'function' && !Component.render){
    const fnSrc = Function.prototype.toString.call(Component);
    const looksLikeAritySSR = Component.length >= 3 || /\$\$result/.test(fnSrc);
    const usesRendererPush = /\$\$renderer\.push\(/.test(fnSrc);
    if(looksLikeAritySSR){
      const ssrFn = Component;
      Component = { render:(props)=>({ html: ssrFn({ head:'', css:new Set(), title:'' }, props||{}, {}, {}) || '' }) };
    } else if(usesRendererPush){
      const ssrFn = Component;
      Component = { render:(props)=>{ const chunks=[]; const $$renderer={ push:(s)=>{ if(s!=null) chunks.push(String(s)); } }; ssrFn($$renderer, props||{}); return { html: chunks.join('') }; } };
    }
  }
  return Component;
}

function fakeEvalUserCode(src){
  // Simule l'exécution CJS transformée retournant un module.exports
  // Pour tests simples on construit quelques patterns.
  // src n'est pas réellement parsé ici.
  return eval(src); // eslint-disable-line no-eval
}

describe('Heuristique SSR normalization', () => {
  it('wrap function arity>=3 into render()', () => {
    const mod = { default: function(a,b,c){ return '<p>OK</p>'; } };
    const norm = normalizeComponentShape(mod);
    expect(typeof norm.render).toBe('function');
    const out = norm.render({});
    expect(out.html).toContain('OK');
  });

  it('wrap $$renderer.push style', () => {
    const mod = { default: function($$renderer){ $$renderer.push('<h1>X</h1>'); } };
    const norm = normalizeComponentShape(mod);
    expect(typeof norm.render).toBe('function');
    const out = norm.render({});
    expect(out.html).toContain('<h1>X</h1>');
  });

  it('preserves normal component with render()', () => {
    const mod = { default: { render: ()=> ({ html: '<span>A</span>' }) } };
    const norm = normalizeComponentShape(mod);
    expect(norm.render().html).toBe('<span>A</span>');
  });

  it('function returning string (non strict) would fallback if not normalized)', () => {
    const mod = { default: ()=> '<div>Plain</div>' };
    const norm = normalizeComponentShape(mod);
    // Non transformé: pas de render => confirm absence (évite fausse normalisation)
    expect(norm.render).toBeUndefined();
  });
});

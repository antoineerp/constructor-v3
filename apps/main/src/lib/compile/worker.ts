// Web Worker pour compilation rapide Svelte côté navigateur
// Import statique de svelte/compiler pour éviter le code splitting (et l'erreur rollup iife multi-chunk)

// NOTE: Cet import alourdit le bundle du worker mais évite l'erreur:
// "Invalid value 'iife' for option 'output.format' - UMD and IIFE output formats are not supported for code-splitting builds"
// Si besoin d'optimiser plus tard, on pourra configurer le format worker en 'es' ou externaliser 'svelte/compiler'.
// @ts-ignore
import * as svelte from 'svelte/compiler';

self.onmessage = async (e: MessageEvent) => {
  const { id, code, filename = 'Component.svelte', options = {} } = e.data;
  try {
    const compiled = svelte.compile(code, {
      generate: 'dom',
      css: true,
      dev: true,
      ...options
    });
    self.postMessage({ id, ok: true, js: compiled.js.code, css: compiled.css?.code, warnings: compiled.warnings });
  } catch (err: any) {
    self.postMessage({ id, ok: false, error: err.message || String(err) });
  }
};

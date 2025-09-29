// Web Worker pour compilation rapide Svelte côté navigateur
// Utilise svelte/compiler dynamiquement (à ajouter via CDN ou build séparé)

self.onmessage = async (e: MessageEvent) => {
  const { id, code, filename = 'Component.svelte', options = {} } = e.data;
  try {
    // Chargement dynamique (assume que svelte/compiler est exposé globalement ou via importScripts)
    // @ts-ignore
    const svelte = self.svelte || (await import('svelte/compiler'));
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

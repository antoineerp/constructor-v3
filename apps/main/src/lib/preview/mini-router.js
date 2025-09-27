// Mini router client pour la preview (mode B/C) sans SvelteKit complet.
// Usage: mountPreviewRouter({ modules, target: HTMLElement });
// modules: [{ path: 'src/routes/+page.svelte', jsCode, ... }]

export function mountPreviewRouter({ modules, target }) {
  if (!target) throw new Error('mountPreviewRouter: target manquant');
  const routeMap = new Map();
  for (const m of modules) {
    if (m.error || !m.jsCode) continue;
    if (/^src\/routes\/(.+\/)?\+page\.svelte$/.test(m.path)) {
      const route = m.path
        .replace(/^src\/routes\//, '')
        .replace(/\/\+page\.svelte$/, '');
      const urlPath = route === '' ? '/' : `/${route}`;
      const blobUrl = URL.createObjectURL(new Blob([m.jsCode], { type: 'text/javascript' }));
      routeMap.set(urlPath, blobUrl);
    }
  }

  let currentInstance = null;

  async function render(pathname, replace = false) {
    const modUrl = routeMap.get(pathname) || routeMap.get('/') || null;
    if (!modUrl) return;
    const mod = await import(/* @vite-ignore */ modUrl);
    if (currentInstance) currentInstance.$destroy?.();
    const Comp = mod.default;
    target.innerHTML = '';
    currentInstance = new Comp({ target });
    if (!replace) history.pushState({}, '', pathname);
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

  return { navigate: (p) => render(p), destroy: () => currentInstance?.$destroy?.() };
}

// Extension simple pour routes dynamiques plus tard:
// - Construire un tableau de patterns { regex, blobUrl }
// - Tester dans render() si aucun match exact.

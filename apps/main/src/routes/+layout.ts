// SEO layout: fournit données standard OG/Twitter + title/description par défaut
// On retire l'import de types local car les types générés ne sont pas présents lors de la compilation isolée (tsc --noEmit)
export const load = async () => {
  // Fallback meta (peuvent être surchargées par des pages via export const seo = {...})
  const base = {
    title: 'Constructor V3',
    description: 'Génération assistée de structures Svelte/SaaS (blueprints, composants, SSR).',
    image: '/og-default.png',
    url: 'https://constructor.example.com'
  };
  return { seo: base };
};

// Utilisation côté +layout.svelte: lire data.seo et injecter dans <svelte:head>
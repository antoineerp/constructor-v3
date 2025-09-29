// SEO layout: fournit données standard OG/Twitter + title/description par défaut
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
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
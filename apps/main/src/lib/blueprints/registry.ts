// Registre central des blueprints/templates validés
// Chaque entrée définit versions exactes & librairies approuvées

export interface BlueprintMeta {
  id: string;
  label: string;
  description?: string;
  svelte: string;
  kit: string;
  vite: string;
  tailwind: string;
  dependencies: Record<string, string>; // libs runtime
  devDependencies: Record<string, string>; // outils build
  approved: string[]; // liste courte des familles (skeleton, flowbite, bits, shadcn)
  createdAt: string;
  updatedAt: string;
}

export const blueprints: BlueprintMeta[] = [
  {
    id: 'skeleton-base',
    label: 'Skeleton Base App',
    description: 'Starter SvelteKit + Skeleton UI + Tailwind configuré',
    svelte: '^5.0.0',
    kit: '^2.5.0',
    vite: '^5.4.0',
    tailwind: '^3.4.0',
    dependencies: {
      '@skeletonlabs/skeleton': '^2.9.0'
    },
    devDependencies: {
      'svelte-check': '^4.0.0'
    },
    approved: ['skeleton'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'flowbite-kit',
    label: 'Flowbite Svelte UI',
    description: 'Starter avec composants Flowbite-Svelte pour prototypage rapide',
    svelte: '^5.0.0',
    kit: '^2.5.0',
    vite: '^5.4.0',
    tailwind: '^3.4.0',
    dependencies: {
      'flowbite-svelte': '^0.46.0',
      flowbite: '^2.3.0'
    },
    devDependencies: {
      'svelte-check': '^4.0.0'
    },
    approved: ['flowbite'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bits-headless',
    label: 'Bits UI Headless',
    description: 'Primitives headless accessibles (Bits UI) + Tailwind',
    svelte: '^5.0.0',
    kit: '^2.5.0',
    vite: '^5.4.0',
    tailwind: '^3.4.0',
    dependencies: {
      'bits-ui': '^0.21.0'
    },
    devDependencies: {
      'svelte-check': '^4.0.0'
    },
    approved: ['bits'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'shadcn-skeleton',
    label: 'shadcn-svelte + Skeleton',
    description: 'Combinaison shadcn-svelte (code distribué) + Skeleton tokens',
    svelte: '^5.0.0',
    kit: '^2.5.0',
    vite: '^5.4.0',
    tailwind: '^3.4.0',
    dependencies: {
      'shadcn-svelte': '^0.8.0',
      'lucide-svelte': '^0.445.0'
    },
    devDependencies: {
      'svelte-check': '^4.0.0'
    },
    approved: ['shadcn', 'skeleton'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function findBlueprint(id: string) {
  return blueprints.find(b => b.id === id);
}

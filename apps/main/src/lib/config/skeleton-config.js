/**
 * 🎨 Configuration Skeleton UI pour Constructor V3
 * 
 * Ce fichier définit la configuration par défaut de Skeleton UI
 * pour tous les projets générés par l'IA.
 */

export const skeletonConfig = {
  // Configuration Tailwind pour Skeleton
  tailwindConfig: `import { skeleton } from '@skeletonlabs/tw-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    skeleton({
      themes: {
        preset: [
          { name: 'skeleton', enhancements: true },
          { name: 'modern', enhancements: true },
          { name: 'rocket', enhancements: true }
        ]
      }
    })
  ],
}`,

  // Layout de base avec Skeleton
  layoutTemplate: `<script>
  import '../app.css';
  import '@skeletonlabs/skeleton/styles/skeleton.css';
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
</script>

<div class="app">
  <slot />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>`,

  // Composants Skeleton de base à inclure
  baseComponents: [
    'AppBar',
    'AppShell',
    'Card',
    'Button',
    'Modal',
    'Drawer',
    'TabGroup',
    'Table',
    'Avatar',
    'ListBox',
    'Accordion',
    'ProgressBar',
    'ProgressRadial',
    'Toast',
    'Stepper',
    'FileButton',
    'InputChip',
    'RadioGroup',
    'SlideToggle'
  ],

  // Imports Skeleton pour les différents types de composants
  componentImports: {
    navigation: `import { AppBar, AppShell, Drawer } from '@skeletonlabs/skeleton';`,
    forms: `import { FileButton, InputChip, RadioGroup, SlideToggle } from '@skeletonlabs/skeleton';`,
    display: `import { Card, Avatar, ProgressBar, ProgressRadial } from '@skeletonlabs/skeleton';`,
    overlay: `import { Modal, Drawer, Toast } from '@skeletonlabs/skeleton';`,
    data: `import { Table, ListBox, Accordion, Paginator } from '@skeletonlabs/skeleton';`,
    layout: `import { AppShell, TabGroup, Stepper } from '@skeletonlabs/skeleton';`
  },

  // Exemples de composants prêts à l'emploi
  examples: {
    header: `<script>
  import { AppBar } from '@skeletonlabs/skeleton';
</script>

<AppBar>
  <svelte:fragment slot="lead">
    <strong class="text-xl uppercase">Brand</strong>
  </svelte:fragment>
  <svelte:fragment slot="trail">
    <a class="btn btn-sm variant-ghost-surface" href="/about">
      About
    </a>
    <a class="btn btn-sm variant-ghost-surface" href="/contact">
      Contact
    </a>
  </svelte:fragment>
</AppBar>`,

    card: `<script>
  import { Card } from '@skeletonlabs/skeleton';
</script>

<Card class="p-4">
  <header class="card-header">
    <h3 class="h3">Card Title</h3>
  </header>
  <section class="card-body">
    <p>Card content goes here.</p>
  </section>
  <footer class="card-footer">
    <button class="btn variant-filled">Action</button>
  </footer>
</Card>`,

    modal: `<script>
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  
  function triggerModal() {
    modalStore.trigger({
      type: 'alert',
      title: 'Example Modal',
      body: 'This is an example modal.'
    });
  }
</script>

<button class="btn variant-filled" on:click={triggerModal}>
  Open Modal
</button>

<Modal />`,

    form: `<script>
  import { InputChip, RadioGroup, SlideToggle } from '@skeletonlabs/skeleton';
  
  let formData = {
    tags: [],
    option: 'option1',
    toggle: false
  };
</script>

<form class="space-y-4">
  <label class="label">
    <span>Tags</span>
    <InputChip bind:value={formData.tags} name="chips" />
  </label>
  
  <RadioGroup>
    <label class="flex items-center space-x-2">
      <input class="radio" type="radio" bind:group={formData.option} value="option1" />
      <span>Option 1</span>
    </label>
    <label class="flex items-center space-x-2">
      <input class="radio" type="radio" bind:group={formData.option} value="option2" />
      <span>Option 2</span>
    </label>
  </RadioGroup>
  
  <SlideToggle bind:checked={formData.toggle}>Enable Feature</SlideToggle>
  
  <button class="btn variant-filled" type="submit">Submit</button>
</form>`
  },

  // Package.json dependencies pour Skeleton
  dependencies: {
    "@skeletonlabs/skeleton": "^3.2.2",
    "@skeletonlabs/tw-plugin": "^0.4.1"
  },

  // Thèmes disponibles
  themes: [
    { id: 'skeleton', name: 'Skeleton', description: 'Default theme' },
    { id: 'modern', name: 'Modern', description: 'Clean and modern' },
    { id: 'rocket', name: 'Rocket', description: 'Vibrant and energetic' },
    { id: 'seafoam', name: 'Seafoam', description: 'Calm and refreshing' },
    { id: 'vintage', name: 'Vintage', description: 'Classic retro look' },
    { id: 'sahara', name: 'Sahara', description: 'Warm desert tones' },
    { id: 'hamlindigo', name: 'Hamlindigo', description: 'Deep indigo' },
    { id: 'gold-nouveau', name: 'Gold Nouveau', description: 'Elegant gold accents' },
    { id: 'crimson', name: 'Crimson', description: 'Bold red theme' }
  ],

  // CSS de base pour tous les projets
  appCss: `/* Skeleton base styles */
@tailwind base;
@tailwind components;
@tailwind utilities;
@tailwind variants;

/* Custom styles */
:root {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

html, body {
  @apply h-full overflow-hidden;
}`,

  // Utilities Skeleton courantes
  utilities: {
    spacing: 'space-y-4, space-x-4, gap-4',
    variants: 'variant-filled, variant-soft, variant-ghost, variant-outline',
    colors: 'text-primary-500, bg-surface-100, border-surface-300',
    responsive: 'md:grid-cols-2, lg:grid-cols-3, xl:grid-cols-4'
  }
};

/**
 * Génère le code Skeleton pour un type de composant donné
 */
export function generateSkeletonComponent(type, options = {}) {
  const { name = 'Component', props = {} } = options;
  
  const componentMap = {
    button: `<script>
  export let variant = 'filled';
  export let size = 'md';
</script>

<button class="btn variant-{variant}" class:btn-sm={size === 'sm'}>
  <slot />
</button>`,

    card: `<script>
  export let padding = 'p-4';
</script>

<div class="card {padding}">
  <header class="card-header">
    <slot name="header" />
  </header>
  <section class="card-body">
    <slot />
  </section>
  <footer class="card-footer">
    <slot name="footer" />
  </footer>
</div>`,

    modal: `<script>
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  
  export let id = 'modal';
  export let title = 'Modal Title';
</script>

<Modal />`,

    form: `<script>
  import { enhance } from '$app/forms';
  
  let formData = {};
</script>

<form method="POST" use:enhance class="space-y-4">
  <slot />
  
  <button class="btn variant-filled" type="submit">
    Submit
  </button>
</form>`,

    navigation: `<script>
  import { AppBar } from '@skeletonlabs/skeleton';
  import { page } from '$app/stores';
</script>

<AppBar>
  <svelte:fragment slot="lead">
    <a href="/" class="font-bold text-xl">
      <slot name="logo">Logo</slot>
    </a>
  </svelte:fragment>
  
  <svelte:fragment slot="trail">
    <slot name="nav" />
  </svelte:fragment>
</AppBar>`,

    layout: `<script>
  import { AppShell } from '@skeletonlabs/skeleton';
</script>

<AppShell>
  <svelte:fragment slot="header">
    <slot name="header" />
  </svelte:fragment>
  
  <svelte:fragment slot="sidebarLeft">
    <slot name="sidebar" />
  </svelte:fragment>
  
  <slot />
  
  <svelte:fragment slot="footer">
    <slot name="footer" />
  </svelte:fragment>
</AppShell>`
  };

  return componentMap[type] || componentMap.card;
}

export default skeletonConfig;

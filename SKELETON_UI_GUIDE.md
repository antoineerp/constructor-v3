# 🎨 Skeleton UI - Framework Principal Constructor V3

**Date:** 1er octobre 2025  
**Version:** 3.2.2  
**Status:** ✅ Activé par défaut

---

## 📋 Vue d'ensemble

**Skeleton UI** est désormais le framework UI par défaut pour Constructor V3 et **tous les projets générés par l'IA**.

### Pourquoi Skeleton ?

✅ **Natif Svelte** - Conçu spécifiquement pour Svelte (pas de wrapper React)  
✅ **Léger** - Basé sur Tailwind CSS, bundle optimisé  
✅ **Modulaire** - Import seulement ce dont tu as besoin  
✅ **Théming** - 9+ thèmes prêts à l'emploi  
✅ **SvelteKit-first** - Parfait pour SSR + routing  
✅ **Accessibilité** - ARIA intégré dans tous les composants  
✅ **TypeScript** - Support natif complet  

---

## 🚀 Installation

### Déjà installé ! ✅

```json
{
  "@skeletonlabs/skeleton": "^3.2.2",
  "@skeletonlabs/tw-plugin": "^0.4.1"
}
```

### Configuration Tailwind

**`tailwind.config.js`** (déjà configuré) :

```javascript
import { skeleton } from '@skeletonlabs/tw-plugin';

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}'
  ],
  plugins: [
    skeleton({
      themes: {
        preset: [
          { name: 'skeleton', enhancements: true },
          { name: 'modern', enhancements: true },
          { name: 'rocket', enhancements: true },
          { name: 'seafoam', enhancements: true }
        ]
      }
    })
  ]
}
```

### Layout Configuration

**`src/routes/+layout.svelte`** (déjà configuré) :

```svelte
<script>
  import '../app.css';
  import '@skeletonlabs/skeleton/styles/skeleton.css';
  import '@skeletonlabs/skeleton/themes/theme-skeleton.css';
</script>

<div class="app">
  <slot />
</div>
```

---

## 🎯 Composants Disponibles

### Navigation

```svelte
<script>
  import { AppBar, AppShell } from '@skeletonlabs/skeleton';
</script>

<AppShell>
  <svelte:fragment slot="header">
    <AppBar>
      <svelte:fragment slot="lead">
        <strong class="text-xl">Mon App</strong>
      </svelte:fragment>
      <svelte:fragment slot="trail">
        <a class="btn variant-ghost-surface" href="/about">About</a>
        <a class="btn variant-filled-primary" href="/contact">Contact</a>
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  
  <!-- Ton contenu ici -->
  <slot />
</AppShell>
```

### Boutons

```svelte
<script>
  import { Button } from '@skeletonlabs/skeleton';
</script>

<!-- Variantes -->
<button class="btn variant-filled">Filled</button>
<button class="btn variant-soft">Soft</button>
<button class="btn variant-ghost">Ghost</button>
<button class="btn variant-outline">Outline</button>

<!-- Couleurs -->
<button class="btn variant-filled-primary">Primary</button>
<button class="btn variant-filled-secondary">Secondary</button>
<button class="btn variant-filled-success">Success</button>
<button class="btn variant-filled-warning">Warning</button>
<button class="btn variant-filled-error">Error</button>

<!-- Tailles -->
<button class="btn btn-sm">Small</button>
<button class="btn">Default</button>
<button class="btn btn-lg">Large</button>
```

### Cards

```svelte
<div class="card p-4">
  <header class="card-header">
    <h3 class="h3">Card Title</h3>
  </header>
  <section class="card-body">
    <p>Card content goes here.</p>
  </section>
  <footer class="card-footer">
    <button class="btn variant-filled">Action</button>
  </footer>
</div>

<!-- Card avec variantes -->
<div class="card variant-soft-primary p-4">Soft Primary</div>
<div class="card variant-ghost-secondary p-4">Ghost Secondary</div>
```

### Modals

```svelte
<script>
  import { Modal, modalStore } from '@skeletonlabs/skeleton';
  
  function triggerModal() {
    modalStore.trigger({
      type: 'alert',
      title: 'Example Modal',
      body: 'This is an example modal dialog.'
    });
  }
  
  function triggerConfirm() {
    modalStore.trigger({
      type: 'confirm',
      title: 'Please Confirm',
      body: 'Are you sure you want to proceed?',
      response: (r) => {
        if (r) console.log('Confirmed!');
      }
    });
  }
</script>

<button class="btn variant-filled" on:click={triggerModal}>
  Open Modal
</button>

<button class="btn variant-filled-warning" on:click={triggerConfirm}>
  Confirm Action
</button>

<!-- Nécessaire une seule fois dans le layout -->
<Modal />
```

### Forms

```svelte
<script>
  import { InputChip, RadioGroup, SlideToggle } from '@skeletonlabs/skeleton';
  
  let tags = ['svelte', 'skeleton'];
  let selectedOption = 'option1';
  let toggleValue = false;
</script>

<form class="space-y-4">
  <!-- Input avec label -->
  <label class="label">
    <span>Email</span>
    <input class="input" type="email" placeholder="email@example.com" />
  </label>
  
  <!-- Textarea -->
  <label class="label">
    <span>Message</span>
    <textarea class="textarea" rows="4" placeholder="Your message..."></textarea>
  </label>
  
  <!-- Input Chips (tags) -->
  <label class="label">
    <span>Tags</span>
    <InputChip bind:value={tags} name="chips" />
  </label>
  
  <!-- Radio Group -->
  <RadioGroup>
    <label class="flex items-center space-x-2">
      <input class="radio" type="radio" bind:group={selectedOption} value="option1" />
      <span>Option 1</span>
    </label>
    <label class="flex items-center space-x-2">
      <input class="radio" type="radio" bind:group={selectedOption} value="option2" />
      <span>Option 2</span>
    </label>
  </RadioGroup>
  
  <!-- Slide Toggle (switch) -->
  <SlideToggle bind:checked={toggleValue}>
    Enable Feature
  </SlideToggle>
  
  <button class="btn variant-filled-primary" type="submit">
    Submit
  </button>
</form>
```

### Tables

```svelte
<script>
  import { Table, tableMapperValues } from '@skeletonlabs/skeleton';
  
  const sourceData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' }
  ];
  
  const tableSimple = {
    head: ['ID', 'Name', 'Email', 'Role'],
    body: tableMapperValues(sourceData, ['id', 'name', 'email', 'role'])
  };
</script>

<div class="table-container">
  <table class="table table-hover">
    <thead>
      <tr>
        {#each tableSimple.head as heading}
          <th>{heading}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each tableSimple.body as row}
        <tr>
          {#each row as cell}
            <td>{cell}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

### Drawers (Sidebars)

```svelte
<script>
  import { Drawer, drawerStore } from '@skeletonlabs/skeleton';
  
  function openDrawer() {
    drawerStore.open({});
  }
</script>

<button class="btn variant-filled" on:click={openDrawer}>
  Open Drawer
</button>

<Drawer>
  <h2 class="h2 p-4">Navigation</h2>
  <nav class="list-nav p-4">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
</Drawer>
```

### Tabs

```svelte
<script>
  import { TabGroup, Tab } from '@skeletonlabs/skeleton';
  
  let tabSet = 0;
</script>

<TabGroup>
  <Tab bind:group={tabSet} name="tab1" value={0}>
    <span>Tab 1</span>
  </Tab>
  <Tab bind:group={tabSet} name="tab2" value={1}>
    <span>Tab 2</span>
  </Tab>
  <Tab bind:group={tabSet} name="tab3" value={2}>
    <span>Tab 3</span>
  </Tab>
  
  <svelte:fragment slot="panel">
    {#if tabSet === 0}
      <p>Content for Tab 1</p>
    {:else if tabSet === 1}
      <p>Content for Tab 2</p>
    {:else if tabSet === 2}
      <p>Content for Tab 3</p>
    {/if}
  </svelte:fragment>
</TabGroup>
```

### Progress

```svelte
<script>
  import { ProgressBar, ProgressRadial } from '@skeletonlabs/skeleton';
</script>

<!-- Progress Bar -->
<ProgressBar value={50} max={100} />
<ProgressBar value={undefined} /> <!-- Indeterminate -->

<!-- Progress Radial (spinner) -->
<ProgressRadial value={75} />
<ProgressRadial value={undefined} /> <!-- Indeterminate spinner -->
```

### Toasts (Notifications)

```svelte
<script>
  import { Toast, toastStore } from '@skeletonlabs/skeleton';
  
  function triggerToast() {
    toastStore.trigger({
      message: 'Hello world!',
      timeout: 3000,
      background: 'variant-filled-success'
    });
  }
  
  function triggerError() {
    toastStore.trigger({
      message: 'Something went wrong!',
      timeout: 5000,
      background: 'variant-filled-error'
    });
  }
</script>

<button class="btn variant-filled" on:click={triggerToast}>
  Show Toast
</button>

<button class="btn variant-filled-error" on:click={triggerError}>
  Show Error
</button>

<!-- Une fois dans le layout -->
<Toast />
```

---

## 🎨 Thèmes Disponibles

### Changer de thème

Dans `+layout.svelte`, change le CSS du thème :

```svelte
<!-- Thème par défaut -->
import '@skeletonlabs/skeleton/themes/theme-skeleton.css';

<!-- Ou un autre thème -->
import '@skeletonlabs/skeleton/themes/theme-modern.css';
import '@skeletonlabs/skeleton/themes/theme-rocket.css';
import '@skeletonlabs/skeleton/themes/theme-seafoam.css';
import '@skeletonlabs/skeleton/themes/theme-vintage.css';
import '@skeletonlabs/skeleton/themes/theme-sahara.css';
import '@skeletonlabs/skeleton/themes/theme-hamlindigo.css';
import '@skeletonlabs/skeleton/themes/theme-gold-nouveau.css';
import '@skeletonlabs/skeleton/themes/theme-crimson.css';
```

### Liste complète des thèmes

| Thème | Description | Use Case |
|-------|-------------|----------|
| **skeleton** | Thème par défaut bleu/gris | Apps professionnelles |
| **modern** | Clean et minimaliste | SaaS modernes |
| **rocket** | Vibrant et énergique | Apps créatives |
| **seafoam** | Calme et rafraîchissant | Apps wellness |
| **vintage** | Look rétro classique | Apps lifestyle |
| **sahara** | Tons désert chaleureux | Apps voyage |
| **hamlindigo** | Indigo profond | Apps corporate |
| **gold-nouveau** | Accents dorés élégants | Apps premium |
| **crimson** | Rouge audacieux | Apps dynamiques |

---

## 🤖 Intégration avec l'IA

### Configuration automatique

L'IA de Constructor V3 est configurée pour :

✅ **Utiliser Skeleton par défaut** pour tous les projets générés  
✅ **Scorer Skeleton +5 points** dans `stackRouter.ts`  
✅ **Inclure les imports Skeleton** dans tous les prompts système  
✅ **Générer du code Skeleton-first** (pas de composants custom inutiles)  

### Prompts système modifiés

Les fichiers suivants incluent maintenant des instructions Skeleton :

- `lib/prompt/promptBuilders.js` → "Tu es un architecte Senior SvelteKit spécialisé en Skeleton UI"
- `lib/prompt/promptLibrary.js` → Tous les templates incluent section "🎨 SKELETON UI OBLIGATOIRE"
- `lib/blueprints/stackRouter.ts` → Skeleton score +5 par défaut

### Exemple de génération

Quand un utilisateur demande "Crée un dashboard avec stats", l'IA génère :

```svelte
<script>
  import { AppShell, AppBar, Card, ProgressBar } from '@skeletonlabs/skeleton';
  
  let stats = [
    { label: 'Users', value: 1240, progress: 75 },
    { label: 'Revenue', value: '$12,400', progress: 60 },
    { label: 'Orders', value: 342, progress: 90 }
  ];
</script>

<AppShell>
  <svelte:fragment slot="header">
    <AppBar>
      <svelte:fragment slot="lead">
        <strong class="text-xl">Dashboard</strong>
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  
  <div class="container mx-auto p-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each stats as stat}
        <div class="card p-4">
          <header class="card-header">
            <h3 class="h3">{stat.label}</h3>
          </header>
          <section class="card-body">
            <p class="text-4xl font-bold">{stat.value}</p>
            <ProgressBar value={stat.progress} max={100} />
          </section>
        </div>
      {/each}
    </div>
  </div>
</AppShell>
```

---

## 📚 Ressources

### Documentation officielle
- **Site:** https://skeleton.dev
- **GitHub:** https://github.com/skeletonlabs/skeleton
- **Discord:** https://discord.gg/skeleton

### Guides
- [Getting Started](https://skeleton.dev/docs/get-started)
- [Theming Guide](https://skeleton.dev/docs/themes)
- [Component Reference](https://skeleton.dev/components)
- [Utilities](https://skeleton.dev/utilities)

### Migration depuis autre UI

Si tu as du code avec d'autres frameworks :

**Shadcn → Skeleton:**
- `<Button>` → `<button class="btn variant-filled">`
- `<Card>` → `<div class="card">`
- `<Dialog>` → `<Modal>` avec `modalStore`

**Flowbite → Skeleton:**
- Même principe, remplace les classes Flowbite par classes Skeleton
- Flowbite: `btn-primary` → Skeleton: `btn variant-filled-primary`

---

## 🎯 Best Practices

### 1. Importer seulement ce dont tu as besoin

```svelte
<!-- ❌ Éviter -->
import * from '@skeletonlabs/skeleton';

<!-- ✅ Bon -->
import { AppBar, Card, Button } from '@skeletonlabs/skeleton';
```

### 2. Utiliser les variants Skeleton

```svelte
<!-- Variantes disponibles -->
variant-filled
variant-soft
variant-ghost
variant-outline
variant-ringed

<!-- Couleurs -->
-primary, -secondary, -tertiary, -success, -warning, -error, -surface
```

### 3. Respecter l'accessibilité

Skeleton intègre l'accessibilité par défaut, mais vérifie :
- Labels sur inputs
- ARIA attributes sur composants custom
- Keyboard navigation

### 4. Responsive design

```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Skeleton + Tailwind responsive classes -->
</div>
```

---

## ✅ Checklist Migration

Pour migrer un projet existant vers Skeleton :

- [ ] Installer `@skeletonlabs/skeleton` et `@skeletonlabs/tw-plugin`
- [ ] Configurer `tailwind.config.js` avec plugin Skeleton
- [ ] Ajouter imports CSS dans `+layout.svelte`
- [ ] Remplacer composants custom par composants Skeleton
- [ ] Tester tous les composants UI
- [ ] Vérifier le thème et l'ajuster si besoin
- [ ] Supprimer anciennes dépendances UI (Shadcn, Flowbite)

---

**Dernière mise à jour:** 1er octobre 2025  
**Status:** ✅ Production Ready

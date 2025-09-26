<script>
  import { onMount } from 'svelte';
  export let logo = 'Constructor';
  export let links = [
    { label: 'Accueil', href: '/' },
    { label: 'Produits', href: '/products' },
    { label: 'Tarifs', href: '/pricing' },
    { label: 'Contact', href: '/contact' }
  ];
  export let cta = { label: 'Commencer', href: '/signup' };
  let mobileOpen = false;
  function toggle() { mobileOpen = !mobileOpen; }
  onMount(()=>{});
</script>

<header class="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <div class="flex items-center gap-8">
      <a href="/" class="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{logo}</a>
      <nav class="hidden md:flex items-center gap-6 text-sm">
        {#each links as l}
          <a href={l.href} class="text-gray-600 hover:text-gray-900 transition-colors font-medium">
            {l.label}
          </a>
        {/each}
      </nav>
    </div>
    <div class="hidden md:flex items-center gap-3">
      <a href={cta.href} class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow hover:from-blue-500 hover:to-indigo-500 transition-colors">
        {cta.label}
      </a>
    </div>
    <button class="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border text-gray-600" on:click={toggle} aria-label="Menu mobile">
      {#if mobileOpen}
        <i class="fas fa-times"></i>
      {:else}
        <i class="fas fa-bars"></i>
      {/if}
    </button>
  </div>
  {#if mobileOpen}
    <div class="md:hidden border-t border-gray-200 bg-white animate-fade-in">
      <nav class="px-4 py-4 flex flex-col gap-4 text-sm">
        {#each links as l}
          <a href={l.href} class="text-gray-700 hover:text-gray-900" on:click={() => mobileOpen = false}>{l.label}</a>
        {/each}
        <a href={cta.href} class="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow">
          {cta.label}
        </a>
      </nav>
    </div>
  {/if}
</header>

<style>
  .animate-fade-in { animation: fade .18s ease; }
  @keyframes fade { from { opacity:0; transform: translateY(-4px);} to { opacity:1; transform: translateY(0);} }
</style>
<script>
  import '../app.css';
  import '@fortawesome/fontawesome-free/css/all.min.css';
  
  import { onMount } from 'svelte';

  // Supabase retiré : session désactivée
  let session = null;
  let loadingSession = false;
  let isAdmin = false;
  function handleAuthNav(){ window.location.href = '/auth'; }
  function logout(){ /* no-op */ }
  export let data;
  $: seo = data?.seo || {};
  const fullTitle = seo?.title ? seo.title : 'Constructor V3';
</script>

<svelte:head>
  <link rel="stylesheet" href="/api/design/tokens" data-tokens="1" />
  <title>{fullTitle}</title>
  {#if seo.description}<meta name="description" content={seo.description} />{/if}
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  {#if seo.title}<meta property="og:title" content={seo.title} />{/if}
  {#if seo.description}<meta property="og:description" content={seo.description} />{/if}
  {#if seo.image}<meta property="og:image" content={seo.image} />{/if}
  {#if seo.url}<meta property="og:url" content={seo.url} />{/if}
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  {#if seo.title}<meta name="twitter:title" content={seo.title} />{/if}
  {#if seo.description}<meta name="twitter:description" content={seo.description} />{/if}
  {#if seo.image}<meta name="twitter:image" content={seo.image} />{/if}
</svelte:head>

<main>
  <nav class="bg-gray-900 text-white px-4 py-2 flex items-center gap-8">
  <a href="/user" class="font-bold text-lg tracking-wide flex items-center gap-2 hover:text-blue-300"><i class="fas fa-cubes text-blue-400"></i> Constructor V3</a>
    <ul class="flex gap-6 text-sm">
  <li><a href="/user" class="hover:text-blue-400">Générateur</a></li>
      <li><a href="/admin" class="hover:text-blue-400">Admin</a></li>
    </ul>
    <div class="ml-auto flex items-center gap-4">
      {#if loadingSession}
        <span class="text-xs text-gray-400 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> Session...</span>
      {:else if !session}
        <button on:click={handleAuthNav} class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2">
          <i class="fas fa-right-to-bracket"></i> Login
        </button>
      {:else}
        <div class="flex items-center gap-3">
          <button on:click={handleAuthNav} class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium flex items-center gap-2">
            <i class="fas {isAdmin ? 'fa-shield-halved' : 'fa-user'}"></i>
            {isAdmin ? 'Admin' : 'Mon espace'}
          </button>
          <button on:click={logout} class="text-xs text-gray-300 hover:text-white flex items-center gap-1" title="Se déconnecter">
            <i class="fas fa-arrow-right-from-bracket"></i> Logout
          </button>
        </div>
      {/if}
    </div>
  </nav>
  <main class="min-h-screen" style="background:var(--color-bg); color:var(--color-text);">
    <slot />
  </main>
</main>
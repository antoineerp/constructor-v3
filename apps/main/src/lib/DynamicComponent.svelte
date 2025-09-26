<script>
  import { componentGenerator } from './componentGenerator.js';
  import { onMount } from 'svelte';
  
  export let description = '';
  export let type = 'generic';
  export let options = {};
  export let fallback = '';
  
  let componentCode = '';
  let loading = true;
  let error = null;
  let componentElement;
  
  onMount(async () => {
    try {
      componentCode = await componentGenerator.generateComponent(description, type, options);
      await renderComponent();
    } catch (err) {
      error = err.message;
      componentCode = fallback || getFallbackComponent();
      await renderComponent();
    } finally {
      loading = false;
    }
  });
  
  async function renderComponent() {
    if (!componentElement) return;
    
    try {
      // Pour la démo, on va juste injecter du HTML
      // Dans un vrai projet, on utiliserait une compilation Svelte dynamique
      componentElement.innerHTML = componentCode;
    } catch (err) {
      console.error('Erreur rendu composant:', err);
      componentElement.innerHTML = fallback || getFallbackComponent();
    }
  }
  
  function getFallbackComponent() {
    return `<div class="p-4 border border-gray-300 rounded bg-gray-50">
      <p class="text-gray-600">Composant ${type} : ${description}</p>
      <slot></slot>
    </div>`;
  }
  
  // Régénérer si les props changent
  $: if (description || type || options) {
    regenerateComponent();
  }
  
  async function regenerateComponent() {
    if (loading) return;
    
    loading = true;
    error = null;
    
    try {
      componentCode = await componentGenerator.generateComponent(description, type, options);
      await renderComponent();
    } catch (err) {
      error = err.message;
      componentCode = fallback || getFallbackComponent();
      await renderComponent();
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="p-4 border border-gray-200 rounded animate-pulse bg-gray-50">
    <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
  </div>
{:else if error}
  <div class="p-4 border border-red-200 rounded bg-red-50 text-red-700">
    <p class="font-medium">Erreur de génération:</p>
    <p class="text-sm">{error}</p>
    <button 
      class="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
      on:click={regenerateComponent}
    >
      Réessayer
    </button>
  </div>
{:else}
  <!-- Composant généré dynamiquement -->
  <div bind:this={componentElement} class="generated-component">
    <!-- Le contenu sera injecté ici -->
  </div>
{/if}

<style>
  :global(.generated-component pre) {
    background: #111827; /* gray-900 */
    color: #f3f4f6; /* gray-100 */
    font-size: 0.75rem; /* text-xs */
    padding: 0.75rem; /* p-3 */
    border-radius: 0.5rem; /* rounded */
    overflow-x: auto;
  }
</style>
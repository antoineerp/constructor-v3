<!-- Composant gestion des templates de prompts -->
<script>
  import Card from '$lib/Card.svelte';
  
  export let promptTemplates = [];
  export let onLoadPrompts = () => {};
</script>

<Card title="Templates de Prompts" subtitle="Templates disponibles dans promptLibrary">
  <div class="flex items-center justify-between mb-4">
    <div class="text-sm text-gray-600">
      {promptTemplates.length} template{promptTemplates.length > 1 ? 's' : ''} disponible{promptTemplates.length > 1 ? 's' : ''}
    </div>
    <button 
      class="text-xs px-2 py-1 rounded bg-blue-600 text-white"
      on:click={onLoadPrompts}
    >
      Actualiser
    </button>
  </div>

  {#if !promptTemplates.length}
    <div class="text-center py-8">
      <i class="fas fa-paragraph text-gray-400 text-4xl mb-4"></i>
      <p class="text-sm text-gray-500 mb-4">Aucun template de prompt trouvé.</p>
      <p class="text-xs text-gray-400">Vérifiez la configuration de promptLibrary.</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each promptTemplates as p, index}
        <div class="p-3 border rounded bg-gray-50 hover:bg-gray-100 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                #{index + 1}
              </span>
              <code class="px-2 py-1 bg-white rounded text-sm font-mono text-gray-800">
                {p}
              </code>
            </div>
            <div class="flex items-center gap-2">
              <button 
                class="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
                on:click={() => navigator.clipboard.writeText(p)}
                title="Copier le nom du template"
              >
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  <div class="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded">
    <i class="fas fa-info-circle mr-1"></i>
    <strong>Info:</strong> Les templates de prompts sont définis dans 
    <code class="px-1 py-0.5 bg-white rounded">src/lib/prompt/promptLibrary.js</code>
  </div>
</Card>
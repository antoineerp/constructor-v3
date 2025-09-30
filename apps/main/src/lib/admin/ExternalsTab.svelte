<!-- Composant gestion des librairies externes -->
<script>
  import Card from '$lib/Card.svelte';
  
  export let externalLibs = [];
  export let externalLoading = false;
  export let externalError = '';
  export let onPreviewCode = (code) => {};
  export let onLoadExternalLibs = () => {};
  
  function formatBytes(n) { 
    if(!n && n!==0) return ''; 
    const u=['B','KB','MB','GB']; 
    let i=0, v=n; 
    while(v>=1024 && i<u.length-1){ v/=1024; i++; } 
    return (i? v.toFixed(1): v)+' '+u[i]; 
  }
</script>

<Card title="Librairies Externes" subtitle="Composants ingérés localement (offline)">
  <div class="flex items-center justify-between mb-4">
    <div class="text-sm text-gray-600">
      {externalLibs.length} librairie{externalLibs.length > 1 ? 's' : ''} disponible{externalLibs.length > 1 ? 's' : ''}
    </div>
    <button 
      class="text-xs px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40"
      on:click={onLoadExternalLibs}
      disabled={externalLoading}
    >
      {externalLoading ? 'Chargement...' : 'Actualiser'}
    </button>
  </div>

  {#if externalLoading}
    <div class="text-center py-8">
      <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-sm text-gray-500">Chargement des librairies...</p>
    </div>
  {:else if externalError}
    <div class="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
      <strong>Erreur:</strong> {externalError}
    </div>
  {:else if !externalLibs.length}
    <div class="text-center py-8">
      <i class="fas fa-boxes-stacked text-gray-400 text-4xl mb-4"></i>
      <p class="text-sm text-gray-500 mb-4">Aucune librairie ingérée.</p>
      <p class="text-xs text-gray-400">Utilisez tools/ingest-external.mjs pour en ajouter.</p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each externalLibs as lib}
        <div class="border rounded-lg bg-white shadow-sm">
          <div class="px-4 py-3 flex items-center justify-between border-b bg-gray-50 rounded-t">
            <div>
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <span>{lib.id}</span>
                {#if lib.meta?.version}
                  <span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {lib.meta.version}
                  </span>
                {/if}
              </h3>
              <p class="text-xs text-gray-500">{lib.meta?.description || 'Pas de description'}</p>
            </div>
            <div class="text-xs text-gray-500">
              {lib.components.length} composant{lib.components.length > 1 ? 's' : ''}
            </div>
          </div>
          
          {#if !lib.components.length}
            <div class="p-4 text-xs text-gray-500">Aucun composant</div>
          {:else}
            <div class="grid md:grid-cols-2 gap-4 p-4">
              {#each lib.components as c}
                <div class="border rounded p-3 bg-gray-50 relative">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-800">{c.name}</h4>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                      {formatBytes(c.size)} • {c.lines} l.
                    </span>
                  </div>
                  
                  <pre class="text-[10px] leading-4 max-h-40 overflow-auto bg-gray-800 text-gray-100 p-2 rounded">
{c.snippet}
                  </pre>
                  
                  <div class="mt-2 flex gap-2">
                    <button 
                      class="text-[11px] underline hover:text-blue-600" 
                      on:click={() => navigator.clipboard.writeText(c.snippet)}
                    >
                      Copier
                    </button>
                    <button 
                      class="text-[11px] underline hover:text-blue-600" 
                      on:click={() => onPreviewCode(c.snippet)}
                    >
                      Prévisualiser
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</Card>
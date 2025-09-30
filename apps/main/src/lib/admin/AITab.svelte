<!-- Composant gestion des fournisseurs IA -->
<script>
  import Card from '$lib/Card.svelte';
  import AiStatusBadge from '$lib/AiStatusBadge.svelte';
  
  export let aiList = [];
  export let aiMap = {};
  export let aiLoading = false;
  export let onLoadAIStatus = () => {};
</script>

<Card title="Statut des Fournisseurs IA" subtitle="Clés détectées côté serveur / masquées">
  <div class="flex items-center justify-between mb-4">
    <AiStatusBadge providers={aiMap} loading={aiLoading} />
    <button 
      class="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300" 
      on:click={onLoadAIStatus} 
      disabled={aiLoading}
    >
      {aiLoading ? '...' : 'Rafraîchir'}
    </button>
  </div>
  
  <div class="grid md:grid-cols-2 gap-3">
    {#each aiList as p}
      <div class="p-3 border rounded bg-white flex flex-col gap-1 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-800">{p.id}</span>
          <span class="px-2 py-0.5 rounded-full {p.connected ? 'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">
            {p.connected ? 'ok':'absent'}
          </span>
        </div>
        {#if p.maskedKey}
          <code class="text-[10px] bg-gray-100 px-1 py-0.5 rounded">{p.maskedKey}</code>
        {/if}
      </div>
    {/each}
    {#if !aiList.length}
      <div class="text-sm text-gray-500">Aucun provider.</div>
    {/if}
  </div>
  
  <div class="mt-4 text-[10px] text-gray-500">
    Dernière mise à jour: {new Date().toLocaleTimeString()} • 
    Providers actifs: {Object.values(aiMap).filter(Boolean).length}
  </div>
</Card>
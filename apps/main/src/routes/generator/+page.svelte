<script>
  import ChatGenerator from '$lib/ChatGenerator.svelte';
  import SiteGenerator from '$lib/SiteGenerator.svelte';

  let provider = 'openai';
  let generationProfile = 'safe';
  let simpleMode = false;
  let activeMode = 'site';
  let availableProviders = [
    { id:'openai', label:'OpenAI' },
    { id:'claude', label:'Claude' }
  ];

  let profiles = [
    { id:'safe', label:'Safe' },
    { id:'enhanced', label:'Enhanced' },
    { id:'external_libs', label:'External Libs' }
  ];
</script>

<svelte:head>
  <title>Constructor V3 - Générateur</title>
</svelte:head>

<div class="max-w-6xl mx-auto py-8 px-4">
  <div class="mb-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-3xl font-bold mb-2 text-indigo-700">Constructor V3 - Générateur</h1>
        <p class="text-gray-600">IA avancée pour applications et composants avec sélection automatique de stack UI</p>
      </div>
      <div class="flex gap-3">
        <a href="/" class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium">
          💬 Chat Principal
        </a>
        <a href="/sandbox" class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
          🛠️ Sandbox
        </a>
        <a href="/admin" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
          ⚙️ Admin
        </a>
      </div>
    </div>
    
    <!-- Mode Selection -->
    <div class="flex gap-4 mb-4">
      <button 
        class="px-4 py-2 rounded border bg-white text-sm font-medium transition-all"
        class:border-indigo-600={activeMode === 'site'}
        class:text-indigo-700={activeMode === 'site'}
        class:bg-indigo-50={activeMode === 'site'}
        class:border-gray-300={activeMode !== 'site'}
        on:click={() => activeMode = 'site'}
      >
        🏗️ Génération de Sites Complets
      </button>
      <button 
        class="px-4 py-2 rounded border bg-white text-sm font-medium transition-all"
        class:border-indigo-600={activeMode === 'chat'}
        class:text-indigo-700={activeMode === 'chat'}
        class:bg-indigo-50={activeMode === 'chat'}
        class:border-gray-300={activeMode !== 'chat'}
        on:click={() => activeMode = 'chat'}
      >
        💬 Assistant IA Composants
      </button>
    </div>
  </div>

  <!-- Configuration -->
  <div class="flex items-center gap-4 mb-6 flex-wrap bg-white p-4 rounded-lg border">
    <div class="flex items-center gap-2">
      <label for="provider-select" class="text-sm font-medium text-gray-700">Provider</label>
      <select id="provider-select" bind:value={provider} class="text-sm border rounded px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
        {#each availableProviders as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2">
      <label for="profile-select" class="text-sm font-medium text-gray-700">Profile</label>
      <select id="profile-select" bind:value={generationProfile} class="text-sm border rounded px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
        {#each profiles as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2">
      <input 
        type="checkbox" 
        id="simple-mode" 
        bind:checked={simpleMode}
        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label for="simple-mode" class="text-sm font-medium text-gray-700">Mode simple</label>
    </div>
  </div>

  <!-- Générateur principal -->
  <SiteGenerator {provider} {generationProfile} {simpleMode} />
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
  }
</style>

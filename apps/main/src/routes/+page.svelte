<script>
  import ChatGenerator from '$lib/ChatGenerator.svelte';
  import SiteGenerator from '$lib/SiteGenerator.svelte';

  let provider = 'openai';
  let generationProfile = 'safe';
  let simpleMode = false;
  let activeTab = 'chat';
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

<div class="max-w-4xl mx-auto py-8 px-4">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-2xl font-bold text-indigo-700">Constructor V3</h1>
    <div class="flex gap-3">
      <a href="/generator" class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium">
        🏗️ Générateur
      </a>
      <a href="/sandbox" class="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium">
        🛠️ Sandbox
      </a>
      <a href="/admin" class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium">
        ⚙️ Admin
      </a>
    </div>
  </div>
  <div class="flex gap-4 mb-6">
  <button class="px-4 py-2 rounded border bg-white text-sm font-medium" class:border-indigo-600={activeTab==='chat'} class:text-indigo-700={activeTab==='chat'} class:border-gray-300={activeTab!=='chat'} on:click={()=>activeTab='chat'}>💬 Chat IA Avancé</button>
  <button class="px-4 py-2 rounded border bg-white text-sm font-medium" class:border-indigo-600={activeTab==='site'} class:text-indigo-700={activeTab==='site'} class:border-gray-300={activeTab!=='site'} on:click={()=>activeTab='site'}>🏗️ Génération de site</button>
  </div>
  <div class="flex items-center gap-4 mb-6 flex-wrap">
    <div class="flex items-center gap-2">
      <label for="provider-select" class="text-xs font-medium text-gray-600">Provider</label>
      <select id="provider-select" bind:value={provider} class="text-xs border rounded px-2 py-1 bg-white">
        {#each availableProviders as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label for="profile-select" class="text-xs font-medium text-gray-600">Profil</label>
      <select id="profile-select" bind:value={generationProfile} class="text-xs border rounded px-2 py-1 bg-white">
        {#each profiles as prof}
          <option value={prof.id}>{prof.label}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label for="simple-mode" class="text-xs font-medium text-gray-600">Mode simple</label>
      <input id="simple-mode" type="checkbox" bind:checked={simpleMode} class="rounded border-gray-300" />
    </div>
  </div>

  {#if activeTab==='chat'}
    <ChatGenerator {provider} />
  {:else}
    <SiteGenerator {provider} {generationProfile} {simpleMode} />
  {/if}
</div>
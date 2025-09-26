<script>
  import SiteGenerator from '$lib/SiteGenerator.svelte';
  import ChatGenerator from '$lib/ChatGenerator.svelte';

  let provider = 'openai';
  let generationProfile = 'safe';
  let simpleMode = false;
  let activeTab = 'site';
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

<div class="max-w-5xl mx-auto py-8 px-4">
  <h1 class="text-3xl font-bold mb-6 text-indigo-700">Générateur</h1>
  <div class="flex gap-4 mb-6 flex-wrap">
    <button class="px-4 py-2 rounded border bg-white text-sm font-medium" class:border-indigo-600={activeTab==='site'} class:text-indigo-700={activeTab==='site'} class:border-gray-300={activeTab!=='site'} on:click={()=>activeTab='site'}>Génération de site</button>
    <button class="px-4 py-2 rounded border bg-white text-sm font-medium" class:border-indigo-600={activeTab==='chat'} class:text-indigo-700={activeTab==='chat'} class:border-gray-300={activeTab!=='chat'} on:click={()=>activeTab='chat'}>Génération de composants</button>
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

  {#if activeTab==='site'}
    <SiteGenerator {provider} {generationProfile} {simpleMode} />
  {:else}
    <ChatGenerator {provider} />
  {/if}
</div>

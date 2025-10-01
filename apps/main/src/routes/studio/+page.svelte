<script>
  /**
   * 🎨 Constructor V3 - Studio Unifié
   * Page unique regroupant toutes les fonctionnalités :
   * - Génération de projets complets (chat + site generator)
   * - Explorateur de fichiers générés
   * - Aperçu interactif (iframe sandbox)
   * - Sandbox rapide pour tester des composants
   * - Debug & meta informations
   */
  
  import { onMount } from 'svelte';
  import { AppBar, TabGroup, Tab } from '@skeletonlabs/skeleton';
  import SiteGenerator from '$lib/SiteGenerator.svelte';
  import ChatGenerator from '$lib/ChatGenerator.svelte';
  import PreviewFrame from '$lib/components/PreviewFrame.svelte';
  
  // Configuration globale
  let provider = 'openai';
  let generationProfile = 'safe';
  let simpleMode = false;
  
  let availableProviders = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'claude', label: 'Claude' }
  ];
  
  let profiles = [
    { id: 'safe', label: 'Safe' },
    { id: 'enhanced', label: 'Enhanced' },
    { id: 'external_libs', label: 'External Libs' }
  ];
  
  // État des onglets
  let activeTab = 'generate'; // 'generate' | 'files' | 'preview' | 'sandbox' | 'debug'
  
  // État de la génération
  let generatedFiles = null;
  let selectedFile = null;
  let generationInProgress = false;
  
  // Sandbox rapide
  let sandboxCode = `<script>
  export let name = 'Test';
  let count = 0;
<\/script>

<div class="p-4">
  <h2 class="text-xl font-bold mb-2">{name}</h2>
  <button 
    class="px-3 py-2 bg-blue-500 text-white rounded"
    on:click={() => count++}
  >
    Clics: {count}
  </button>
</div>`;
  
  // Fonction pour recevoir les fichiers générés
  function handleFilesGenerated(files) {
    generatedFiles = files;
    selectedFile = Object.keys(files)[0]; // Sélectionner le premier fichier
    activeTab = 'files'; // Passer à l'onglet fichiers
  }
</script>

<svelte:head>
  <title>Constructor V3 - Studio</title>
</svelte:head>
<div class="h-screen flex flex-col bg-surface-50">
  <!-- Header avec Skeleton AppBar -->
  <AppBar background="bg-surface-100" border="border-b border-surface-300">
    <svelte:fragment slot="lead">
      <strong class="text-xl text-primary-600">🎨 Constructor V3 Studio</strong>
      <span class="badge variant-filled-primary ml-3">Unified</span>
    </svelte:fragment>
    
    <svelte:fragment slot="trail">
      <select 
        bind:value={provider}
        class="select select-sm variant-form-material"
      >
        {#each availableProviders as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
      
      <select 
        bind:value={generationProfile}
        class="select select-sm variant-form-material"
      >
        {#each profiles as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
      
      <label class="flex items-center gap-2">
        <input type="checkbox" class="checkbox" bind:checked={simpleMode} />
        <span class="text-sm">Mode simple</span>
      </label>
      
      <a href="/" class="btn btn-sm variant-ghost-surface">
        ← Accueil
      </a>
    </svelte:fragment>
  </AppBar>
  </header>
  
  <!-- Navigation par onglets -->
  <nav class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex gap-1">
  
  <!-- Navigation par onglets avec Skeleton TabGroup -->
  <div class="bg-surface-100 border-b border-surface-300">
    <div class="max-w-7xl mx-auto px-4">
      <TabGroup>
        <Tab bind:group={activeTab} name="generate" value="generate">
          <span>🚀 Générer</span>
        </Tab>
        <Tab bind:group={activeTab} name="files" value="files" disabled={!generatedFiles}>
          <span>📁 Fichiers {generatedFiles ? `(${Object.keys(generatedFiles).length})` : ''}</span>
        </Tab>
        <Tab bind:group={activeTab} name="preview" value="preview" disabled={!generatedFiles}>
          <span>👁️ Aperçu</span>
        </Tab>
        <Tab bind:group={activeTab} name="sandbox" value="sandbox">
          <span>🛠️ Sandbox</span>
        </Tab>
        <Tab bind:group={activeTab} name="debug" value="debug">
          <span>🐛 Debug</span>
        </Tab>
      </TabGroup>
    </div>
  </div>
      {#if activeTab === 'generate'}
        <div class="space-y-6">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-800">Génération par chat IA</h2>
            <ChatGenerator 
              {provider} 
              {generationProfile}
              on:filesGenerated={(e) => handleFilesGenerated(e.detail)}
            />
          </div>
          
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <h2 class="text-xl font-bold mb-4 text-gray-800">Génération de site complet</h2>
            <SiteGenerator 
              {provider} 
  
  <!-- Contenu principal -->
  <main class="flex-1 overflow-auto bg-surface-50">
    <div class="max-w-7xl mx-auto px-4 py-6">
      
      <!-- Onglet Générer -->
      {#if activeTab === 'generate'}
        <div class="space-y-6">
          <div class="card p-6 variant-ghost-surface">
            <header class="card-header">
              <h2 class="h2">Génération par chat IA</h2>
            </header>
            <section class="card-body">
              <ChatGenerator 
                {provider} 
                {generationProfile}
                on:filesGenerated={(e) => handleFilesGenerated(e.detail)}
              />
            </section>
          </div>
          
          <div class="card p-6 variant-ghost-surface">
            <header class="card-header">
              <h2 class="h2">Génération de site complet</h2>
            </header>
            <section class="card-body">
              <SiteGenerator 
                {provider} 
                {generationProfile} 
                {simpleMode}
                on:filesGenerated={(e) => handleFilesGenerated(e.detail)}
              />
            </section>
          </div>
        </div>
      {/if}
      
      <!-- Onglet Fichiers -->
      {#if activeTab === 'files'}
        {#if generatedFiles}
          <div class="grid grid-cols-12 gap-4 h-full">
            <!-- Liste des fichiers -->
            <div class="col-span-3 card p-4">
              <h3 class="h3 mb-3">Fichiers générés</h3>
              <div class="list-nav space-y-1">
                {#each Object.keys(generatedFiles) as filename}
                  <button
                    class="btn w-full justify-start {selectedFile === filename ? 'variant-filled-primary' : 'variant-ghost-surface'}"
                    on:click={() => selectedFile = filename}
                  >
              {#if selectedFile}
                <div class="border-b border-surface-300 p-3 flex items-center justify-between">
                  <span class="text-sm font-medium">{selectedFile}</span>
                  <button 
                    class="btn btn-sm variant-ghost-surface"
                    on:click={() => navigator.clipboard.writeText(generatedFiles[selectedFile])}
                  >
                    📋 Copier
                  </button>
                </div>
                <pre class="p-4 text-xs overflow-auto max-h-[600px] bg-surface-100"><code>{generatedFiles[selectedFile]}</code></pre>
              {:else}
                <div class="p-8 text-center text-surface-600">
                  Sélectionnez un fichier pour voir son contenu
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="card p-12 text-center">
            <p class="text-surface-600 mb-4">Aucun fichier généré pour le moment</p>
            <button
              class="btn variant-filled-primary"
              on:click={() => activeTab = 'generate'}
            >
              Générer un projet
            </button>
          </div>
        {/if}
      {/if}
      
      <!-- Onglet Aperçu -->
      {#if activeTab === 'preview'}
        {#if generatedFiles}
          <div class="card p-4">
            <PreviewFrame 
              files={generatedFiles}
              title="Aperçu du projet généré"
            />
          </div>
        {:else}
          <div class="card p-12 text-center">
            <p class="text-surface-600 mb-4">Aucun projet à prévisualiser</p>
            <button
              class="btn variant-filled-primary"
              on:click={() => activeTab = 'generate'}
            >
              Générer un projet
            </button>
          </div>
        {/if}
      {/if}
      
      <!-- Onglet Sandbox -->
      {#if activeTab === 'sandbox'}
        <div class="grid grid-cols-2 gap-4">
          <!-- Éditeur -->
          <div class="card">
            <header class="card-header">
              <h3 class="h3">Éditeur Svelte</h3>
            </header>
            <textarea
              bind:value={sandboxCode}
              class="textarea w-full h-[500px] font-mono text-sm resize-none"
              placeholder="Écrivez votre code Svelte ici..."
            ></textarea>
            <footer class="card-footer flex justify-end">
              <button class="btn variant-filled-primary">
                🔄 Compiler & Prévisualiser
              </button>
            </footer>
          </div>
          
          <!-- Aperçu -->
          <div class="card">
            <header class="card-header">
              <h3 class="h3">Aperçu</h3>
            </header>
            <section class="card-body p-4">
              <PreviewFrame 
                files={{ 'src/routes/+page.svelte': sandboxCode }}
                title="Sandbox test"
              />
            </section>
          </div>
        </div>
      {/if}
      
      <!-- Onglet Debug -->
      {#if activeTab === 'debug'}
        <div class="card p-6">
          <header class="card-header">
            <h2 class="h2">Informations de debug</h2>
          </header>
          <section class="card-body space-y-4">
            <div>
              <h3 class="h3 mb-2">Configuration</h3>
              <pre class="code bg-surface-100 p-4 rounded">{JSON.stringify({ provider, generationProfile, simpleMode }, null, 2)}</pre>
            </div>
            {#if generatedFiles}
              <div>
                <h3 class="h3 mb-2">Fichiers générés ({Object.keys(generatedFiles).length})</h3>
                <ul class="list">
                  {#each Object.keys(generatedFiles) as filename}
                    <li>
                      <span class="badge variant-soft-surface">{filename}</span>
                      <span class="text-sm text-surface-600">
                        {generatedFiles[filename].length} caractères
                      </span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </section>
        </div>
      {/if}
      
    </div>
  </main>
  
  <!-- Footer -->
  <footer class="bg-surface-100 border-t border-surface-300 py-3">
    <div class="max-w-7xl mx-auto px-4 text-center text-sm text-surface-600">
      Constructor V3 Studio - Architecture unifiée avec Skeleton UI
    </div>
  </footer>
</div>

<style>
  /* Styles personnalisés si nécessaire */
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
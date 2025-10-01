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

<div class="h-screen flex flex-col bg-gray-50">
  <!-- Header -->
  <header class="bg-white border-b shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold text-indigo-700">🎨 Constructor V3 Studio</h1>
          <span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
            Unified
          </span>
        </div>
        
        <!-- Configuration globale -->
        <div class="flex items-center gap-3">
          <select 
            bind:value={provider}
            class="px-3 py-1 border rounded text-sm"
          >
            {#each availableProviders as p}
              <option value={p.id}>{p.label}</option>
            {/each}
          </select>
          
          <select 
            bind:value={generationProfile}
            class="px-3 py-1 border rounded text-sm"
          >
            {#each profiles as p}
              <option value={p.id}>{p.label}</option>
            {/each}
          </select>
          
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" bind:checked={simpleMode} />
            Mode simple
          </label>
          
          <a href="/" class="px-3 py-1 text-gray-600 hover:text-gray-900 text-sm">
            ← Accueil
          </a>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Navigation par onglets -->
  <nav class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex gap-1">
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'generate' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-900'}"
          on:click={() => activeTab = 'generate'}
        >
          🚀 Générer
        </button>
        
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'files' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-900'}"
          on:click={() => activeTab = 'files'}
          disabled={!generatedFiles}
        >
          📁 Fichiers {generatedFiles ? `(${Object.keys(generatedFiles).length})` : ''}
        </button>
        
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'preview' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-900'}"
          on:click={() => activeTab = 'preview'}
          disabled={!generatedFiles}
        >
          👁️ Aperçu
        </button>
        
        <button
          class="px-4 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'sandbox' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-gray-600 hover:text-gray-900'}"
          on:click={() => activeTab = 'sandbox'}
        >
          🛠️ Sandbox
        </button>
      </div>
    </div>
  </nav>
  
  <!-- Contenu principal -->
  <main class="flex-1 overflow-auto">
    <div class="max-w-7xl mx-auto px-4 py-6">
      
      <!-- Onglet Générer -->
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
              {generationProfile} 
              {simpleMode}
              on:filesGenerated={(e) => handleFilesGenerated(e.detail)}
            />
          </div>
        </div>
      {/if}
      
      <!-- Onglet Fichiers -->
      {#if activeTab === 'files'}
        {#if generatedFiles}
          <div class="grid grid-cols-12 gap-4 h-full">
            <!-- Liste des fichiers -->
            <div class="col-span-3 bg-white rounded-lg shadow-sm border p-4">
              <h3 class="text-sm font-bold mb-3 text-gray-700">Fichiers générés</h3>
              <div class="space-y-1">
                {#each Object.keys(generatedFiles) as filename}
                  <button
                    class="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 transition-colors {selectedFile === filename ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}"
                    on:click={() => selectedFile = filename}
                  >
                    {filename}
                  </button>
                {/each}
              </div>
            </div>
            
            <!-- Éditeur de code -->
            <div class="col-span-9 bg-white rounded-lg shadow-sm border">
              {#if selectedFile}
                <div class="border-b p-3 flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-700">{selectedFile}</span>
                  <button 
                    class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    on:click={() => navigator.clipboard.writeText(generatedFiles[selectedFile])}
                  >
                    📋 Copier
                  </button>
                </div>
                <pre class="p-4 text-xs overflow-auto max-h-[600px] bg-gray-50"><code>{generatedFiles[selectedFile]}</code></pre>
              {:else}
                <div class="p-8 text-center text-gray-500">
                  Sélectionnez un fichier pour voir son contenu
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p class="text-gray-500 mb-4">Aucun fichier généré pour le moment</p>
            <button
              class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
          <div class="bg-white rounded-lg shadow-sm border p-4">
            <PreviewFrame 
              files={generatedFiles}
              title="Aperçu du projet généré"
            />
          </div>
        {:else}
          <div class="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p class="text-gray-500 mb-4">Aucun projet à prévisualiser</p>
            <button
              class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
          <div class="bg-white rounded-lg shadow-sm border">
            <div class="border-b p-3">
              <h3 class="text-sm font-bold text-gray-700">Éditeur Svelte</h3>
            </div>
            <textarea
              bind:value={sandboxCode}
              class="w-full h-[500px] p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="Écrivez votre code Svelte ici..."
            ></textarea>
            <div class="border-t p-3 flex justify-end">
              <button
                class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                🔄 Compiler & Prévisualiser
              </button>
            </div>
          </div>
          
          <!-- Aperçu -->
          <div class="bg-white rounded-lg shadow-sm border">
            <div class="border-b p-3">
              <h3 class="text-sm font-bold text-gray-700">Aperçu</h3>
            </div>
            <div class="p-4">
              <PreviewFrame 
                files={{ 'src/routes/+page.svelte': sandboxCode }}
                title="Sandbox test"
              />
            </div>
          </div>
        </div>
      {/if}
      
    </div>
  </main>
  
  <!-- Footer -->
  <footer class="bg-white border-t py-3">
    <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
      Constructor V3 Studio - Architecture unifiée et sécurisée (Bolt.new style)
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

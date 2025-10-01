<script>
  /**
   * 🎨 Constructor V3 - Studio Simple et Fonctionnel
   * Version simplifiée qui MARCHE - pas de surengineering
   */
  
  import { onMount } from 'svelte';
  import SiteGenerator from '$lib/SiteGenerator.svelte';
  import PreviewFrame from '$lib/components/PreviewFrame.svelte';
  
  // Configuration globale
  let provider = 'openai';
  let generationProfile = 'safe';
  let simpleMode = false;
  
  // État des onglets
  let activeTab = 'generate';
  
  // État de la génération
  let generatedFiles = null;
  let selectedFile = null;
  let generationInProgress = false;
  
  // Sandbox simple
  let sandboxCode = `<script>
  let count = 0;
<\/script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Test Constructor v3</h1>
  <button 
    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
    on:click={() => count++}
  >
    Compteur: {count}
  </button>
</div>`;

  function handleFilesGenerated(files) {
    generatedFiles = files;
    selectedFile = Object.keys(files)[0] || null;
    activeTab = 'files';
    generationInProgress = false;
  }

  function getFileLanguage(filename) {
    const ext = filename.split('.').pop();
    if (ext === 'svelte') return 'svelte';
    if (ext === 'js' || ext === 'cjs') return 'javascript';
    if (ext === 'ts') return 'typescript';
    if (ext === 'json') return 'json';
    if (ext === 'css') return 'css';
    if (ext === 'html') return 'html';
    return 'plaintext';
  }
</script>

<svelte:head>
  <title>Studio - Constructor v3</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <h1 class="text-xl font-bold text-gray-900">Constructor v3</h1>
      <a href="/" class="px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50">
        ← Accueil
      </a>
    </div>
  </header>

  <!-- Navigation par onglets -->
  <div class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4">
      <nav class="flex space-x-8">
        <button 
          class="py-4 px-2 border-b-2 {activeTab === 'generate' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} hover:text-gray-700"
          on:click={() => activeTab = 'generate'}
        >
          🚀 Générer
        </button>
        <button 
          class="py-4 px-2 border-b-2 {activeTab === 'files' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} hover:text-gray-700"
          on:click={() => activeTab = 'files'}
        >
          📁 Fichiers
        </button>
        <button 
          class="py-4 px-2 border-b-2 {activeTab === 'preview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} hover:text-gray-700"
          on:click={() => activeTab = 'preview'}
        >
          👁️ Aperçu
        </button>
        <button 
          class="py-4 px-2 border-b-2 {activeTab === 'sandbox' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'} hover:text-gray-700"
          on:click={() => activeTab = 'sandbox'}
        >
          🧪 Sandbox
        </button>
      </nav>
    </div>
  </div>

  <!-- Contenu principal -->
  <main class="max-w-7xl mx-auto px-4 py-6">
    
    <!-- Onglet Génération -->
    {#if activeTab === 'generate'}
      <div class="bg-white shadow-sm border rounded-lg p-6">
        <header class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold">Générer un nouveau projet</h2>
        </header>
        <section class="p-4">
          <SiteGenerator 
            {provider}
            {generationProfile}
            {simpleMode}
            on:filesGenerated={(e) => handleFilesGenerated(e.detail)}
            on:generationStart={() => generationInProgress = true}
          />
        </section>
      </div>
    {/if}

    <!-- Onglet Fichiers -->
    {#if activeTab === 'files'}
      {#if generatedFiles}
        <div class="grid grid-cols-4 gap-4">
          <!-- Liste des fichiers -->
          <div class="bg-white shadow-sm border rounded-lg p-4">
            <h3 class="font-medium mb-3">Fichiers générés</h3>
            <ul class="space-y-1">
              {#each Object.keys(generatedFiles) as filename}
                <li>
                  <button
                    class="w-full text-left p-2 rounded text-sm {selectedFile === filename ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'}"
                    on:click={() => selectedFile = filename}
                  >
                    {filename}
                  </button>
                </li>
              {/each}
            </ul>
          </div>

          <!-- Contenu du fichier -->
          <div class="col-span-3">
            {#if selectedFile && generatedFiles[selectedFile]}
              <header class="flex justify-between items-center p-4 border-b border-gray-200 bg-white rounded-t-lg">
                <h4 class="font-medium">{selectedFile}</h4>
                <span class="text-xs px-2 py-1 bg-gray-100 rounded">
                  {getFileLanguage(selectedFile)}
                </span>
              </header>
              <section class="bg-white rounded-b-lg">
                <pre class="p-4 text-sm overflow-auto max-h-96 bg-gray-50"><code>{generatedFiles[selectedFile]}</code></pre>
              </section>
            {:else}
              <div class="p-8 text-center text-gray-500 bg-white rounded-lg">
                Sélectionnez un fichier
              </div>
            {/if}
          </div>
        </div>
      {:else}
        <div class="bg-white shadow-sm border rounded-lg p-12 text-center">
          <p class="text-gray-600 mb-4">Aucun fichier généré</p>
          <button
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            on:click={() => activeTab = 'generate'}
          >
            Commencer la génération
          </button>
        </div>
      {/if}
    {/if}

    <!-- Onglet Aperçu -->
    {#if activeTab === 'preview'}
      {#if generatedFiles}
        <div class="bg-white shadow-sm border rounded-lg">
          <header class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold">Aperçu du projet</h3>
          </header>
          <section>
            <PreviewFrame 
              files={generatedFiles}
              loading={generationInProgress}
            />
          </section>
        </div>
      {:else}
        <div class="bg-white shadow-sm border rounded-lg p-12 text-center">
          <p class="text-gray-600 mb-4">Pas d'aperçu disponible</p>
          <button
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
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
        <!-- Éditeur simple -->
        <div class="bg-white shadow-sm border rounded-lg">
          <header class="p-4 border-b border-gray-200">
            <h3 class="font-medium">Éditeur</h3>
          </header>
          <section>
            <textarea
              bind:value={sandboxCode}
              class="w-full h-64 p-4 font-mono text-sm resize-none border-0 focus:ring-0"
              placeholder="Écrivez votre code Svelte ici..."
            />
          </section>
          <footer class="p-4 border-t border-gray-200">
            <button 
              class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              on:click={() => {}}
            >
              ▶ Exécuter
            </button>
          </footer>
        </div>

        <!-- Résultat -->
        <div class="bg-white shadow-sm border rounded-lg">
          <header class="p-4 border-b border-gray-200">
            <h3 class="font-medium">Résultat</h3>
          </header>
          <section>
            <PreviewFrame 
              files={{'App.svelte': sandboxCode}}
              loading={false}
            />
          </section>
        </div>
      </div>
    {/if}

  </main>
</div>
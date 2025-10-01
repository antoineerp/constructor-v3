<!-- 
🎯 PreviewFrame.svelte - Composant de prévisualisation sécurisée comme Bolt.new
Utilise iframe sandbox pour exécuter le code généré par l'IA côté client uniquement
-->
<script>
  import { onMount } from 'svelte';
  
  export let projectId = null;
  export let files = null;
  export let loading = false;
  export let error = '';
  export let title = 'Application Preview';
  
  let iframeEl;
  let previewHtml = '';
  let isFullscreen = false;
  
  // Variables pour les stats de performance
  let compileTime = 0;
  let renderStartTime = 0;
  
  async function loadPreview() {
    if ((!projectId && !files) || loading) return;
    
    loading = true;
    error = '';
    previewHtml = '';
    
    const startTime = Date.now();
    
    try {
      let endpoint, body;
      
      if (files) {
        // Mode temporaire (comme notre SiteGenerator)
        endpoint = '/api/projects/temporary/compile';
        body = { 
          files, 
          entries: ['src/routes/+page.svelte'],
          external: false // Mode local avec data URLs 
        };
      } else {
        // Mode projet persisté
        endpoint = `/api/projects/${projectId}/compile`;
        body = {};
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      compileTime = Date.now() - startTime;
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur de compilation');
      }
      
      if (data.runtimeHtml) {
        previewHtml = data.runtimeHtml;
        renderStartTime = Date.now();
      } else {
        throw new Error('Aucun HTML runtime généré');
      }
      
    } catch (err) {
      console.error('[PreviewFrame] Load failed:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
  }
  
  function openInNewTab() {
    if (!previewHtml) return;
    
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Nettoyage après délai
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  function refreshPreview() {
    loadPreview();
  }
  
  // Auto-load au mount seulement
  onMount(() => {
    if (projectId || (files && Object.keys(files).length > 0)) {
      loadPreview();
    }
  });
  
  // Éviter les boucles infinies - seulement quand les données changent vraiment
  let lastFilesHash = '';
  $: {
    if (files) {
      const newHash = JSON.stringify(Object.keys(files).sort());
      if (newHash !== lastFilesHash && !loading) {
        lastFilesHash = newHash;
        loadPreview();
      }
    }
  }
  
  // Mesurer le temps de rendu de l'iframe
  function onIframeLoad() {
    if (renderStartTime) {
      const renderTime = Date.now() - renderStartTime;
      console.log(`[PreviewFrame] Render completed in ${renderTime}ms (compile: ${compileTime}ms)`);
    }
  }
</script>

<div class="preview-frame-container" class:fullscreen={isFullscreen}>
  <!-- Header avec contrôles -->
  <div class="preview-header">
    <div class="flex items-center gap-3">
      <div class="preview-status">
        {#if loading}
          <div class="status-indicator loading"></div>
          <span class="text-sm text-gray-600">Compilation...</span>
        {:else if error}
          <div class="status-indicator error"></div>
          <span class="text-sm text-red-600">Erreur</span>
        {:else if previewHtml}
          <div class="status-indicator success"></div>
          <span class="text-sm text-green-600">
            Actif {compileTime ? `(${compileTime}ms)` : ''}
          </span>
        {:else}
          <div class="status-indicator idle"></div>
          <span class="text-sm text-gray-500">Inactif</span>
        {/if}
      </div>
      
      <h3 class="text-sm font-medium text-gray-800">{title}</h3>
    </div>
    
    <div class="preview-controls">
      <button 
        class="control-btn" 
        on:click={refreshPreview}
        title="Recompiler"
        aria-label="Recompiler l'aperçu"
        disabled={loading}
      >
        <i class="fas fa-sync-alt" class:fa-spin={loading}></i>
      </button>
      
      <button 
        class="control-btn" 
        on:click={openInNewTab}
        title="Ouvrir dans un nouvel onglet"
        aria-label="Ouvrir dans un nouvel onglet"
        disabled={!previewHtml}
      >
        <i class="fas fa-external-link-alt"></i>
      </button>
      
      <button 
        class="control-btn" 
        on:click={toggleFullscreen}
        title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
        aria-label={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
      >
        <i class="fas {isFullscreen ? 'fa-compress' : 'fa-expand'}"></i>
      </button>
    </div>
  </div>
  
  <!-- Zone de prévisualisation -->
  <div class="preview-content">
    {#if loading}
      <div class="preview-placeholder">
        <div class="loading-animation">
          <div class="spinner"></div>
          <p class="text-sm text-gray-600 mt-3">
            Compilation sécurisée en cours...<br>
            <span class="text-xs text-gray-500">Comme Bolt.new - exécution client uniquement</span>
          </p>
        </div>
      </div>
    {:else if error}
      <div class="preview-placeholder error">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-3"></i>
          <p class="text-sm text-red-700 mb-2">Erreur de compilation</p>
          <p class="text-xs text-red-600">{error}</p>
          <button 
            class="mt-3 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
            on:click={refreshPreview}
          >
            Réessayer
          </button>
        </div>
      </div>
    {:else if previewHtml}
      <!-- 🔒 IFRAME SANDBOX SÉCURISÉ - Approche Bolt.new -->
      <iframe
        bind:this={iframeEl}
        srcdoc={previewHtml}
        title="Application Preview - Exécution sécurisée côté client"
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        referrerpolicy="no-referrer"
        class="preview-iframe"
        on:load={onIframeLoad}
      ></iframe>
    {:else}
      <div class="preview-placeholder">
        <div class="empty-content">
          <i class="fas fa-play-circle text-gray-400 text-3xl mb-3"></i>
          <p class="text-sm text-gray-600 mb-1">Aucun aperçu généré</p>
          <p class="text-xs text-gray-500 mb-3">
            Génère d'abord une application ou sélectionne un projet
          </p>
          {#if projectId || files}
            <button 
              class="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              on:click={loadPreview}
            >
              Générer l'aperçu
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .preview-frame-container {
    @apply bg-white border rounded-lg shadow-sm overflow-hidden;
    height: 500px;
    display: flex;
    flex-direction: column;
  }
  
  .preview-frame-container.fullscreen {
    @apply fixed inset-4 z-50 shadow-2xl;
    height: auto;
  }
  
  .preview-header {
    @apply flex items-center justify-between px-4 py-2 bg-gray-50 border-b;
  }
  
  .preview-status {
    @apply flex items-center gap-2;
  }
  
  .status-indicator {
    @apply w-2 h-2 rounded-full;
  }
  
  .status-indicator.loading {
    @apply bg-blue-500;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .status-indicator.success {
    @apply bg-green-500;
  }
  
  .status-indicator.error {
    @apply bg-red-500;
  }
  
  .status-indicator.idle {
    @apply bg-gray-300;
  }
  
  .preview-controls {
    @apply flex items-center gap-2;
  }
  
  .control-btn {
    @apply w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors;
  }
  
  .control-btn:disabled {
    @apply text-gray-400 hover:text-gray-400 hover:bg-transparent cursor-not-allowed;
  }
  
  .preview-content {
    @apply flex-1 relative;
  }
  
  .preview-iframe {
    @apply w-full h-full border-0;
  }
  
  .preview-placeholder {
    @apply w-full h-full flex items-center justify-center;
  }
  
  .preview-placeholder.error {
    @apply bg-red-50;
  }
  
  .loading-animation,
  .error-content,
  .empty-content {
    @apply text-center;
  }
  
  .spinner {
    @apply w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
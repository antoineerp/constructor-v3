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
  export let svelteCode = '';
  
  let iframeEl;
  let previewHtml = '';
  let isFullscreen = false;
  let iframeUrl = '';
  
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
        console.log('[PreviewFrame] Loading with files:', Object.keys(files));
        // Mode temporaire - appeler le compilateur avec id='temporary'
        // L'endpoint [id] va gérer ce cas spécial
        endpoint = '/api/projects/temporary/compile';
        body = { 
          files, 
          entries: ['src/routes/+page.svelte'],
          format: 'html', // Explicitement demander le format HTML
          external: false // Mode local avec data URLs 
        };
      } else {
        // Mode projet persisté
        endpoint = `/api/projects/${projectId}/compile`;
        body = { format: 'html' };
      }
      
      console.log('[PreviewFrame] Calling:', endpoint, body);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      console.log('[PreviewFrame] Response:', data);
      
      compileTime = Date.now() - startTime;
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}: ${data.details || 'Erreur de compilation'}`);
      }
      
      if (data.runtimeHtml) {
        previewHtml = data.runtimeHtml;
        renderStartTime = Date.now();
        console.log('[PreviewFrame] HTML loaded, length:', previewHtml.length);
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
  
  onMount(() => {
    const html = `<!DOCTYPE html><html><head></head><body><div id=\"app\"></div></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    iframeUrl = URL.createObjectURL(blob);
  });
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
    
    <!-- Preview isolée via Blob URL -->
    {#if svelteCode}
      <div class="isolated-preview">
        <iframe
          src={iframeUrl}
          sandbox="allow-scripts"
          class="w-full h-full border rounded"
          title="Preview"
        ></iframe>
      </div>
    {/if}
  </div>
</div>

<style>
  .preview-frame-container {
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 500px;
  }
  
  .preview-frame-container.fullscreen {
    position: fixed;
    inset: 1rem;
    z-index: 50;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    height: auto;
  }
  
  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .preview-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
  }
  
  .status-indicator.loading {
    background-color: #3b82f6;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .status-indicator.success {
    background-color: #4ade80;
  }
  
  .status-indicator.error {
    background-color: #f87171;
  }
  
  .status-indicator.idle {
    background-color: #d1d5db;
  }
  
  .preview-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .control-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4b5563;
    transition: background-color 0.2s, color 0.2s;
    border-radius: 0.375rem;
  }
  
  .control-btn:hover {
    background-color: #e5e7eb;
    color: #111827;
  }
  
  .control-btn:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }
  
  .preview-content {
    flex: 1;
    position: relative;
  }
  
  .preview-iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
  
  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .preview-placeholder.error {
    background-color: #fee2e2;
  }
  
  .loading-animation,
  .error-content,
  .empty-content {
    text-align: center;
  }
  
  .spinner {
    width: 2rem;
    height: 2rem;
    border: 0.25rem solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 9999px;
    margin: 0 auto;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .isolated-preview {
    width: 100%;
    height: 100%;
    margin-top: 1rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  iframe {
    width: 100%;
    height: 100%;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
</style>
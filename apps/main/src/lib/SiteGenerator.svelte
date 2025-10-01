<script>
  import { supabase } from '$lib/supabase.js';
  export let provider = 'openai';
  export let generationProfile = 'safe';
  export let simpleMode = false;

  let sitePrompt = '';
  let siteGenerating = false;
  let siteBlueprint = null;
  let siteFiles = null;
  let siteSelectedFile = null;
  let siteCapabilities = [];
  let siteError = '';
  let toast = null; let toastTimer;

  // Variables pour l'aperçu interactif
  let showCodeView = false;
  let previewHtml = '';
  let previewLoading = false;
  let previewError = '';
  let currentProjectId = null;

  function showToast(message, kind='error', ttl=5000){
    toast = { message, kind };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast = null, ttl);
  }

  async function repairAllFiles() {
    if (!siteFiles || siteGenerating) return;
    
    siteGenerating = true;
    let repairedCount = 0;
    
    try {
      for (const [filename, content] of Object.entries(siteFiles)) {
        if (filename.endsWith('.svelte')) {
          try {
            const repairRes = await fetch('/api/repair/auto', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename,
                code: content,
                maxPasses: 2,
                allowCatalog: true
              })
            });
            
            const repairData = await repairRes.json();
            if (repairData.success && repairData.fixedCode && repairData.fixedCode !== content) {
              siteFiles[filename] = repairData.fixedCode;
              repairedCount++;
            }
          } catch (e) {
            console.warn('Repair failed for', filename, e.message);
          }
        }
      }
      
      if (repairedCount > 0) {
        showToast(`${repairedCount} fichier(s) réparé(s) automatiquement`, 'success');
        siteFiles = { ...siteFiles }; // Force reactivity
      } else {
        showToast('Aucune réparation nécessaire', 'success');
      }
    } catch (e) {
      showToast('Erreur lors de la réparation: ' + e.message, 'error');
    } finally {
      siteGenerating = false;
    }
  }

  async function generateSite() {
    if (!sitePrompt.trim() || siteGenerating) return;
    siteError = '';
    siteGenerating = true;
    siteBlueprint = null;
    siteFiles = null;
    siteSelectedFile = null;
    try {
      let token = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      } catch (_e) { 
        // Ignore session errors
      }
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/site/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query: sitePrompt.trim(), 
          simpleMode, 
          generationProfile, 
          provider,
          autoRepair: true // Force l'auto-réparation
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success){
        // Messages clés manquantes / provider
        if(data?.missingKey){
          showToast(`Clé ${data.missingKey} absente – aucune génération possible. Configure la clé et réessaie.`, 'warn', 8000);
        } else if(data?.stage === 'precheck-jquery'){
          showToast('Code rejeté: usage jQuery détecté en mode strict.', 'warn');
        } else {
          showToast(data.error || 'Erreur génération site');
        }
        throw new Error(data.error || 'Erreur génération site');
      }
      siteBlueprint = data.blueprint;
      siteFiles = data.files;
      siteCapabilities = data.capabilities || [];
      // Sélection fichier principal
      const mainCandidates = ['src/routes/+page.svelte', 'src/routes/index.svelte'];
      for (const c of mainCandidates) { if (siteFiles[c]) { siteSelectedFile = c; break; } }
      if (!siteSelectedFile) siteSelectedFile = Object.keys(siteFiles)[0] || null;
    } catch (e) {
      siteError = e.message;
    } finally {
      siteGenerating = false;
    }
  }

  async function previewFullApp() {
    if (!siteFiles || Object.keys(siteFiles).length === 0) {
      showToast('Aucune application générée à prévisualiser', 'warn');
      return;
    }

    previewLoading = true;
    previewError = '';
    previewHtml = '';

    try {
      // Si on a déjà un projectId (génération précédente), on l'utilise
      // Sinon, on compile directement les fichiers
      
      const res = await fetch('/api/projects/temporary/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          files: siteFiles,
          entries: ['src/routes/+page.svelte']
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur de compilation');
      }

      if (data.runtimeHtml) {
        previewHtml = data.runtimeHtml;
        showToast('Aperçu généré avec succès !', 'success', 3000);
      } else {
        throw new Error('Aucun HTML généré par la compilation');
      }

    } catch (error) {
      console.error('Erreur preview:', error);
      previewError = error.message;
      showToast('Erreur lors de la génération de l\'aperçu: ' + error.message, 'error');
    } finally {
      previewLoading = false;
    }
  }

  function openInNewTab() {
    if (!previewHtml) {
      showToast('Aucun aperçu à ouvrir', 'warn');
      return;
    }
    
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Nettoyer l'URL après un délai
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Auto-génération de l'aperçu quand les fichiers changent
  $: if (siteFiles && siteSelectedFile && !showCodeView && !previewHtml && !previewLoading) {
    previewFullApp();
  }
</script>

<div class="p-4 border rounded bg-white shadow-sm mb-6">
  <h2 class="text-lg font-bold mb-2 flex items-center gap-2"><i class="fas fa-globe text-indigo-600"></i> Génération de site</h2>
  <div class="flex gap-2 mb-3">
    <input type="text" bind:value={sitePrompt} placeholder="Décris ton site (ex: CRM bilingue avec dashboard)" class="flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    <button 
      class="px-4 py-2 rounded font-medium transition-colors"
      class:bg-indigo-600={sitePrompt.trim() && !siteGenerating}
      class:text-white={sitePrompt.trim() && !siteGenerating}
      class:hover:bg-indigo-700={sitePrompt.trim() && !siteGenerating}
      class:bg-gray-300={!sitePrompt.trim() || siteGenerating}
      class:text-gray-500={!sitePrompt.trim() || siteGenerating}
      class:cursor-not-allowed={!sitePrompt.trim() || siteGenerating}
      on:click={generateSite} 
      disabled={!sitePrompt.trim() || siteGenerating}
    >
      {siteGenerating ? 'Génération...' : 'Générer'}
    </button>
  </div>
  {#if siteError}
    <div class="text-sm text-red-600 mb-2">{siteError}</div>
  {/if}
    {#if toast}
      <div class="fixed bottom-4 right-4 max-w-sm p-3 rounded shadow text-sm"
        class:bg-red-600={toast.kind==='error'}
        class:bg-yellow-600={toast.kind==='warn'}
        class:bg-green-600={toast.kind==='success'}
        style="color:white;">
        <div class="flex items-start gap-2">
          <span class="mt-0.5"><i class="fas {toast.kind==='success' ? 'fa-check-circle' : toast.kind==='warn' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i></span>
          <span class="leading-snug">{toast.message}</span>
    <button class="ml-auto text-white/70 hover:text-white" on:click={() => toast=null} aria-label="Fermer la notification"><i class="fas fa-times"></i></button>
        </div>
      </div>
    {/if}
  {#if siteBlueprint}
    <div class="mb-4">
      <h3 class="text-sm font-semibold mb-1">Blueprint</h3>
      <pre class="text-xs bg-gray-50 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(siteBlueprint, null, 2)}</pre>
    </div>
    <div class="mb-4">
      <h3 class="text-sm font-semibold mb-1">Fichiers générés ({Object.keys(siteFiles||{}).length})</h3>
      <div class="flex items-center gap-2 mb-2">
        <div class="flex flex-wrap gap-2 flex-1">
          {#each Object.keys(siteFiles||{}) as f}
            <button class="text-xs px-2 py-1 border rounded {siteSelectedFile===f?'bg-indigo-50 border-indigo-500':'bg-white'}" on:click={()=>siteSelectedFile=f}>{f}</button>
          {/each}
        </div>
        <button 
          class="text-xs px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600" 
          on:click={repairAllFiles}
          title="Réparer automatiquement les erreurs de syntaxe"
        >
          🔧 Réparer
        </button>
      </div>
    </div>
    {#if siteCapabilities.length}
      <div class="mb-4">
        <h3 class="text-sm font-semibold mb-1">Capabilities détectées</h3>
        <ul class="text-xs space-y-1">
          {#each siteCapabilities as c}
            <li class="flex items-center justify-between"><span>{c.id}</span><span class="text-gray-500">{c.score?.toFixed ? c.score.toFixed(2):c.score}</span></li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if siteSelectedFile}
      <div class="mb-4">
        <h3 class="text-sm font-semibold mb-1 flex items-center justify-between">
          <span>Aperçu de l'application générée</span>
          <div class="flex gap-2">
            <button 
              class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              on:click={previewFullApp}
              title="Prévisualiser toute l'application"
            >
              🌐 Aperçu complet
            </button>
            <button 
              class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              on:click={() => showCodeView = !showCodeView}
              title="Basculer vue code/rendu"
            >
              {showCodeView ? '👁️ Voir rendu' : '📝 Voir code'}
            </button>
          </div>
        </h3>
        
        {#if showCodeView}
          <!-- Vue code traditionnel -->
          <pre class="text-xs bg-gray-50 p-2 rounded max-h-96 overflow-auto">{siteFiles[siteSelectedFile]}</pre>
        {:else}
          <!-- Vue rendu interactif -->
          {#if previewHtml}
            <div class="border rounded bg-white">
              <div class="px-2 py-1 bg-gray-100 text-xs text-gray-600 border-b flex items-center justify-between">
                <span>Rendu interactif : {siteSelectedFile}</span>
                <button 
                  class="text-xs px-2 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                  on:click={openInNewTab}
                  title="Ouvrir dans un nouvel onglet"
                >
                  ↗️ Nouveau tab
                </button>
              </div>
              <iframe
                srcdoc={previewHtml}
                class="w-full h-96 border-0"
                sandbox="allow-scripts allow-same-origin"
                title="Aperçu de l'application"
              ></iframe>
            </div>
          {:else if previewLoading}
            <div class="h-96 border rounded bg-gray-50 flex items-center justify-center">
              <div class="text-center">
                <i class="fas fa-spinner fa-spin text-2xl text-blue-500 mb-2"></i>
                <p class="text-sm text-gray-600">Compilation de l'aperçu en cours...</p>
              </div>
            </div>
          {:else if previewError}
            <div class="h-96 border rounded bg-red-50 flex items-center justify-center">
              <div class="text-center text-red-600">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p class="text-sm">Erreur de compilation</p>
                <p class="text-xs mt-1">{previewError}</p>
                <button 
                  class="mt-2 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  on:click={previewFullApp}
                >
                  Réessayer
                </button>
              </div>
            </div>
          {:else}
            <div class="h-96 border rounded bg-gray-50 flex items-center justify-center">
              <div class="text-center">
                <p class="text-sm text-gray-600 mb-2">Aucun aperçu généré</p>
                <button 
                  class="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  on:click={previewFullApp}
                >
                  Générer l'aperçu
                </button>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

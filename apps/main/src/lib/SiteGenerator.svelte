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

  function showToast(message, kind='error', ttl=5000){
    toast = { message, kind };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast = null, ttl);
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
        body: JSON.stringify({ query: sitePrompt.trim(), simpleMode, generationProfile, provider })
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
</script>

<div class="p-4 border rounded bg-white shadow-sm mb-6">
  <h2 class="text-lg font-bold mb-2 flex items-center gap-2"><i class="fas fa-globe text-indigo-600"></i> Génération de site</h2>
  <div class="flex gap-2 mb-3">
    <input type="text" bind:value={sitePrompt} placeholder="Décris ton site (ex: CRM bilingue avec dashboard)" class="flex-1 px-3 py-2 border rounded" />
    <button class="px-4 py-2 bg-indigo-600 text-white rounded" on:click={generateSite} disabled={siteGenerating}>Générer</button>
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
      <div class="flex flex-wrap gap-2">
        {#each Object.keys(siteFiles||{}) as f}
          <button class="text-xs px-2 py-1 border rounded {siteSelectedFile===f?'bg-indigo-50 border-indigo-500':'bg-white'}" on:click={()=>siteSelectedFile=f}>{f}</button>
        {/each}
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
        <h3 class="text-sm font-semibold mb-1">Aperçu du fichier sélectionné</h3>
        <pre class="text-xs bg-gray-50 p-2 rounded max-h-96 overflow-auto">{siteFiles[siteSelectedFile]}</pre>
      </div>
    {/if}
  {/if}
</div>

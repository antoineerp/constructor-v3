<script>
  // Page simplifiée: uniquement génération d'application IA
  let appPrompt = '';
  let appIsGenerating = false;
  let appFiles = null; // { filename: code }
  let appSelectedFile = null;
  let appError = '';
  let compileUrl = '';
  let compiling = false;
  let activeView = 'code'; // 'code' | 'render'
  const compileCache = new Map(); // filename -> objectURL

  async function generateApplication() {
    appError = '';
    appIsGenerating = true;
    try {
      const res = await fetch('/api/generate/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: appPrompt })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur inconnue');
      appFiles = data.files || null;
      appSelectedFile = appFiles ? Object.keys(appFiles)[0] : null;
    } catch (e) {
      console.error(e);
      appError = e.message;
    } finally {
      appIsGenerating = false;
    }
  }

  function resetGeneration() {
    appFiles = null;
    appSelectedFile = null;
    compileUrl='';
  }
  function selectFile(f) { appSelectedFile = f; }
  function copyCurrent() { if(appSelectedFile) navigator.clipboard.writeText(appFiles[appSelectedFile]); }

  async function compileSelected() {
    if(!appSelectedFile || !appSelectedFile.endsWith('.svelte')) { compileUrl=''; return; }
    compiling = true; compileUrl='';
    try {
      // Utilise endpoint component compile direct sans projet persistant
      const res = await fetch('/api/compile/component', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: appFiles[appSelectedFile] }) });
      if(!res.ok){ compileUrl='error:'+ (await res.text()); }
      else {
        // On ne peut pas directement iframer la réponse POST; on fabrique un blob local.
        const html = await res.text();
        const blob = new Blob([html], { type:'text/html' });
        compileUrl = URL.createObjectURL(blob);
        compileCache.set(appSelectedFile, compileUrl);
      }
    } catch(e){ compileUrl = 'error:'+e.message; }
    finally { compiling = false; }
  }

  $: if(activeView === 'render' && appSelectedFile?.endsWith('.svelte')) {
    // Charger depuis cache sinon compiler
    if(compileCache.has(appSelectedFile)) {
      compileUrl = compileCache.get(appSelectedFile);
    } else if(!compiling) {
      compileSelected();
    }
  }
</script>

<div class="max-w-6xl mx-auto px-4 py-10">
  <h1 class="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
    <i class="fas fa-diagram-project text-purple-600"></i>
    Générateur d'application
  </h1>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Panneau gauche: Prompt & actions -->
    <div class="bg-white border rounded-xl shadow-sm p-5 flex flex-col gap-5">
      <div>
        <label for="app_prompt" class="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
        <textarea id="app_prompt" bind:value={appPrompt} rows="8" placeholder="Ex: Génère une mini app SvelteKit avec une page d'accueil, page produits et page contact. Utilise Tailwind." class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
        <p class="text-[11px] text-gray-500 mt-1 leading-snug">Décris architecture, pages, style, contraintes (taille, libs). Moins de 8 fichiers recommandé.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 flex items-center gap-2" on:click={generateApplication} disabled={!appPrompt.trim() || appIsGenerating}>
          {#if appIsGenerating}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-gears"></i>{/if}
          Générer
        </button>
        {#if appFiles}
          <button class="px-4 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50 flex items-center gap-2" on:click={resetGeneration}><i class="fas fa-rotate-left"></i> Réinitialiser</button>
        {/if}
      </div>
      {#if appError}
        <div class="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{appError}</div>
      {/if}
      <div class="text-[11px] text-gray-500 leading-relaxed">
        <p class="mb-1 font-medium text-gray-700">Tips :</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li>Nomme les routes (/, /produits, /contact)</li>
          <li>Indique style (SaaS moderne, gradient bleu)</li>
          <li>Précise contraintes: « pas d'auth », « données mock »</li>
          <li>Limite nombre de fichiers si besoin</li>
        </ul>
      </div>
    </div>

    <!-- Panneau droit: Résultats -->
    <div class="bg-white border rounded-xl shadow-sm p-0 flex flex-col overflow-hidden lg:col-span-2 min-h-[540px]">
      {#if !appFiles}
        <div class="flex-1 flex items-center justify-center text-gray-400 text-sm p-10 text-center">
          {#if appIsGenerating}
            Génération en cours...
          {:else}
            Aucune application générée pour l'instant.
          {/if}
        </div>
      {:else}
        <div class="flex h-full">
          <div class="w-52 border-r bg-gray-50 p-3 overflow-auto text-xs space-y-1">
            {#each Object.keys(appFiles) as f}
              <button class="block w-full text-left px-2 py-1.5 rounded border text-[11px] break-all {appSelectedFile === f ? 'bg-white border-purple-400 text-purple-700 font-medium' : 'bg-white/70 hover:bg-white border-gray-200 text-gray-600'}" on:click={() => selectFile(f)}>{f}</button>
            {/each}
          </div>
          <div class="flex-1 flex flex-col">
            <div class="px-4 pt-2 border-b bg-gray-50">
              <div class="flex items-center justify-between mb-2 text-xs">
                <div class="flex items-center gap-2">
                  <i class="fas fa-file-code text-purple-600"></i>
                  <span class="font-medium truncate max-w-[240px]" title={appSelectedFile}>{appSelectedFile || 'Sélectionne un fichier'}</span>
                </div>
                <div class="flex items-center gap-3">
                  {#if appSelectedFile}
                    <button class="text-purple-600 hover:underline" on:click={copyCurrent}>Copier</button>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-4 text-[11px] font-medium">
                <button
                  class="pb-2 border-b-2 -mb-px px-1 border-transparent text-gray-500 hover:text-gray-700"
                  class:border-purple-600={activeView==='code'}
                  class:text-purple-600={activeView==='code'}
                  on:click={()=> activeView='code'}>Code</button>
                <button
                  class="pb-2 border-b-2 -mb-px px-1 border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-40"
                  class:border-purple-600={activeView==='render'}
                  class:text-purple-600={activeView==='render'}
                  on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='render'; }}
                  disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>Rendu SSR</button>
              </div>
            </div>
            {#if activeView==='code'}
              <div class="flex-1 overflow-auto bg-gray-900 text-green-300 text-[11px] p-4 font-mono leading-relaxed">
                {#if appSelectedFile}
                  <pre><code>{appFiles[appSelectedFile]}</code></pre>
                {:else}
                  <div class="h-full flex items-center justify-center text-gray-500">Choisis un fichier dans la liste.</div>
                {/if}
              </div>
            {:else if activeView==='render'}
              <div class="flex-1 bg-white relative">
                {#if !appSelectedFile}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun fichier sélectionné.</div>
                {:else if !appSelectedFile.endsWith('.svelte')}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs">Le rendu SSR n'est disponible que pour les fichiers .svelte</div>
                {:else}
                  {#if compiling && !compileUrl}
                    <div class="h-full flex items-center justify-center text-gray-500 text-xs gap-2"><i class="fas fa-spinner fa-spin"></i> Compilation...</div>
                  {:else if compileUrl && compileUrl.startsWith('error:')}
                    <div class="p-4 text-xs text-red-600 bg-red-50 h-full overflow-auto">{compileUrl.slice(6)}</div>
                  {:else if compileUrl}
                    <iframe title="Rendu SSR" src={compileUrl} class="absolute inset-0 w-full h-full bg-white"></iframe>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  textarea { font-family: inherit; }
  pre { white-space: pre; }
</style>
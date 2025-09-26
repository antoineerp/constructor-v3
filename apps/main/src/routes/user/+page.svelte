<script>
  // Page simplifiée: uniquement génération d'application IA
  let appPrompt = '';
  let appIsGenerating = false;
  let appFiles = null; // { filename: code }
  let appValidation = null; // { filename: { diagnostics, ssrOk, domOk, formatted, ... } }
  let appSelectedFile = null;
  let appError = '';
  let compileUrl = '';
  let compiling = false;
  let activeView = 'code'; // 'files' | 'code' | 'preview-ssr' | 'preview-interactive'
  const compileCache = new Map(); // filename -> objectURL
  const interactiveCache = new Map(); // filename -> { url, ts }
  let interactiveUrl = '';
  let interactiveLoading = false;
  let showDiagnostics = true;
  let repairing = false;
  let repairMessage = '';
  let lastPatched = null;

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
  appValidation = data.validation || null;
      if(appFiles){
        const keys = Object.keys(appFiles);
        // On privilégie le premier fichier .svelte pour que l'utilisateur voie rapidement un rendu
        const firstSvelte = keys.find(k=>k.endsWith('.svelte'));
        appSelectedFile = firstSvelte || keys[0] || null;
        // Si on a trouvé un .svelte on bascule automatiquement sur l'onglet Rendu SSR
  if(firstSvelte) activeView = 'preview-ssr'; else activeView='files';
      } else {
        appSelectedFile = null;
      }
    } catch (e) {
      console.error(e);
      appError = e.message;
    } finally {
      appIsGenerating = false;
    }
  }

  function resetGeneration() {
    appFiles = null;
    appValidation = null;
    appSelectedFile = null;
    compileUrl='';
  }
  function selectFile(f) { appSelectedFile = f; }
  function copyCurrent() { if(appSelectedFile) navigator.clipboard.writeText(appFiles[appSelectedFile]); }
  async function repairCurrent(){
    if(!appSelectedFile || !appValidation?.[appSelectedFile]) return;
    repairing = true; repairMessage='';
    try {
      const meta = appValidation[appSelectedFile];
      const res = await fetch('/api/repair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ filename: appSelectedFile, code: meta.formatted || meta.original || appFiles[appSelectedFile], diagnostics: meta.diagnostics||[] }) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Échec réparation');
      lastPatched = data.patchedCode;
      appFiles[appSelectedFile] = data.patchedCode;
      compileCache.delete(appSelectedFile);
      interactiveCache.delete(appSelectedFile);
      // Intégration revalidation live si présente
      if(data.validation){
        appValidation[appSelectedFile] = {
          ...data.validation,
          original: meta.original,
          fixed: data.validation.fixed || data.patchedCode,
          formatted: data.validation.formatted || data.patchedCode
        };
        const errs = data.validation.diagnostics?.filter(d=>d.severity==='error').length || 0;
        if(errs===0) repairMessage = 'Réparation appliquée et validée ✔'; else repairMessage = `Réparation appliquée mais ${errs} erreur(s) restantes.`;
      } else {
        repairMessage = 'Réparation appliquée (validation indisponible).';
      }
    } catch(e){ repairMessage = e.message; }
    finally { repairing = false; }
  }

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

  async function buildInteractive() {
    if(!appSelectedFile || !appSelectedFile.endsWith('.svelte')) { interactiveUrl=''; return; }
    if(interactiveCache.has(appSelectedFile)) { interactiveUrl = interactiveCache.get(appSelectedFile).url; return; }
    interactiveLoading = true; interactiveUrl='';
    try {
      const res = await fetch('/api/compile/dom', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: appFiles[appSelectedFile] }) });
      const data = await res.json();
      if(!data.success) { interactiveUrl = 'error:'+ (data.error||'Compilation DOM échouée'); }
      else {
        const cssBlock = data.css ? `<style>${data.css}</style>` : '';
        const componentJs = data.js;
        const safeCssBlock = cssBlock.replace(/<\/script>/g,'<\\/script>');
        const safeJsBase = componentJs.replace(/<\/script>/g,'<\\/script>');
        // Transforme export default pour exposer la classe puis encapsule tout dans un script injecté dynamiquement
        const safeJs = safeJsBase.replace(/export default /, 'window.__App = ');
        const payload = {
          css: safeCssBlock,
          js: safeJs
        };
        const bootParts = [];
        bootParts.push('<!DOCTYPE html><html><head><meta charset="utf-8" />');
        bootParts.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />');
        bootParts.push('<scr'+'ipt src="https://cdn.tailwindcss.com"></scr'+'ipt>');
        if(payload.css) bootParts.push(payload.css);
        bootParts.push('</head><body class="p-4"><div id="app"></div>');
        bootParts.push('<scr'+'ipt>(function(){');
        bootParts.push('const data = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(payload))+'"));');
        bootParts.push("try{");
        bootParts.push("const blob = new Blob([data.js],{type:'text/javascript'});");
        bootParts.push("const u = URL.createObjectURL(blob);");
        bootParts.push("import(u).then(m=>{const App = window.__App || m.default || m.App; const target=document.getElementById('app'); new App({target});});");
        bootParts.push("}catch(e){document.getElementById('app').innerText='Erreur JS: '+e.message}");
        bootParts.push('})();</scr'+'ipt></body></html>');
        const boot = bootParts.join('\n');
        const runtime = boot;
        const blob = new Blob([runtime], { type:'text/html' });
        const url = URL.createObjectURL(blob);
        interactiveUrl = url;
        interactiveCache.set(appSelectedFile, { url, ts: Date.now() });
      }
    } catch(e){ interactiveUrl = 'error:'+e.message; }
    finally { interactiveLoading = false; }
  }

  $: if(activeView === 'interactive' && appSelectedFile?.endsWith('.svelte')) {
    if(interactiveCache.has(appSelectedFile)) interactiveUrl = interactiveCache.get(appSelectedFile).url; else if(!interactiveLoading) buildInteractive();
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
          <div class="flex-1 flex flex-col">
            <!-- Barre onglets globaux -->
            <div class="bg-gray-50 border-b px-4 pt-3">
              <div class="flex items-center gap-6 text-[12px] font-medium">
                <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='files' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> activeView='files'}>
                  <i class="fas fa-folder-open mr-1"></i>Fichiers
                </button>
                <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='code' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> activeView='code'} disabled={!appSelectedFile}>
                  <i class="fas fa-code mr-1"></i>Code
                </button>
                <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='preview-ssr' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='preview-ssr'; }} disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>
                  <i class="fas fa-eye mr-1"></i>Preview SSR
                </button>
                <button class="pb-2 -mb-px border-b-2 border-transparent hover:text-gray-800 {activeView==='preview-interactive' ? 'text-purple-600 border-purple-600' : 'text-gray-500'}" on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='preview-interactive'; }} disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>
                  <i class="fas fa-play-circle mr-1"></i>Interactif
                </button>
              </div>
              <div class="flex items-center justify-between mt-3 mb-2 text-xs">
                <div class="flex items-center gap-2">
                  <i class="fas fa-file-code text-purple-600"></i>
                  <span class="font-medium truncate max-w-[240px]" title={appSelectedFile}>{appSelectedFile || 'Aucun fichier sélectionné'}</span>
                </div>
                <div class="flex items-center gap-3">
                  {#if appSelectedFile}
                    <button class="text-purple-600 hover:underline" on:click={copyCurrent}>Copier</button>
                    {#if appValidation && appValidation[appSelectedFile]?.diagnostics?.length}
                      <button class="text-amber-600 hover:underline disabled:opacity-50" disabled={repairing} on:click={repairCurrent}>
                        {#if repairing}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-wrench"></i>{/if} Réparer (IA)
                      </button>
                    {/if}
                  {/if}
                </div>
              </div>
            </div>

            <!-- Contenu suivant onglet -->
            {#if activeView==='files'}
              <div class="flex-1 overflow-auto p-4 bg-white text-xs space-y-1">
                <div class="text-[11px] text-gray-500 mb-2">Liste des fichiers générés.</div>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {#each Object.keys(appFiles) as f}
                    {#key f}
                      {@const meta = appValidation && appValidation[f]}
                      <button
                        class="relative group text-left px-2 py-2 rounded border text-[11px] break-all transition-colors
                          {appSelectedFile === f ? 'bg-purple-50 border-purple-400 text-purple-700 font-medium' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}"
                        on:click={()=> { selectFile(f); if(f.endsWith('.svelte')) activeView='code'; }}
                        title={meta && meta.diagnostics?.length ? meta.diagnostics.map(d=>d.severity+': '+d.message).join('\n') : f}
                      >
                        <div class="flex items-center gap-1">
                          {#if f.endsWith('.svelte')}
                            <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-purple-600 text-white text-[9px] font-bold">S</span>
                          {/if}
                          <span class="truncate flex-1">{f}</span>
                          {#if meta}
                            {#if meta.diagnostics && meta.diagnostics.some(d=>d.severity==='error')}
                              <i class="fas fa-circle-exclamation text-red-500" title="Erreurs détectées"></i>
                            {:else if meta.ssrOk && meta.domOk}
                              <i class="fas fa-check-circle text-emerald-500" title="SSR & DOM OK"></i>
                            {:else if meta.ssrOk || meta.domOk}
                              <i class="fas fa-circle text-amber-500" title="Compilation partielle"></i>
                            {/if}
                          {/if}
                        </div>
                      </button>
                    {/key}
                  {/each}
                </div>
              </div>
            {:else if activeView==='code'}
              <div class="flex-1 overflow-auto bg-gray-900 text-green-300 text-[11px] p-4 font-mono leading-relaxed relative">
                {#if appSelectedFile}
                  <pre class="mb-4"><code>{(appValidation && appValidation[appSelectedFile]?.formatted) || appFiles[appSelectedFile]}</code></pre>
                  <div class="mt-2 text-[10px] text-gray-400 space-y-2 bg-gray-800/40 p-3 rounded border border-gray-700">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-gray-300">Diagnostics</span>
                      <button class="text-xs underline" on:click={()=> showDiagnostics=!showDiagnostics}>{showDiagnostics ? 'masquer' : 'afficher'}</button>
                    </div>
                    {#if repairMessage}<div class="text-amber-400">{repairMessage}</div>{/if}
                    {#if showDiagnostics}
                      {#if appValidation && appValidation[appSelectedFile]}
                        {#if appValidation[appSelectedFile].diagnostics.length === 0}
                          <div class="text-emerald-400">Aucun diagnostic.</div>
                        {:else}
                          <ul class="space-y-1 max-h-56 overflow-auto pr-1">
                            {#each appValidation[appSelectedFile].diagnostics as d, i}
                              <li class="rounded px-2 py-1 bg-gray-800/60 border border-gray-700 flex gap-2 items-start">
                                <span class="uppercase text-[9px] mt-0.5 tracking-wide {d.severity==='error' ? 'text-red-400' : d.severity==='warning' ? 'text-amber-300' : 'text-gray-400'}">{d.severity}</span>
                                <span class="flex-1 leading-snug">{d.message}</span>
                                <div class="flex flex-col items-end gap-0.5 text-[9px] text-gray-500">
                                  {#if d.rule}<span>{d.rule}</span>{/if}
                                  {#if d.line}<span>L{d.line}</span>{/if}
                                </div>
                              </li>
                            {/each}
                          </ul>
                        {/if}
                      {/if}
                    {/if}
                  </div>
                {:else}
                  <div class="h-full flex items-center justify-center text-gray-500">Sélectionne un fichier dans l'onglet Fichiers.</div>
                {/if}
              </div>
            {:else if activeView==='preview-ssr'}
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
            {:else if activeView==='preview-interactive'}
              <div class="flex-1 bg-white relative">
                {#if !appSelectedFile}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs">Aucun fichier sélectionné.</div>
                {:else if !appSelectedFile.endsWith('.svelte')}
                  <div class="h-full flex items-center justify-center text-gray-500 text-xs">Mode interactif seulement pour .svelte</div>
                {:else}
                  {#if interactiveLoading && !interactiveUrl}
                    <div class="h-full flex items-center justify-center text-gray-500 text-xs gap-2"><i class="fas fa-spinner fa-spin"></i> Construction sandbox...</div>
                  {:else if interactiveUrl && interactiveUrl.startsWith('error:')}
                    <div class="p-4 text-xs text-red-600 bg-red-50 h-full overflow-auto">{interactiveUrl.slice(6)}</div>
                  {:else if interactiveUrl}
                    <iframe title="Sandbox Interactif" sandbox="allow-scripts" src={interactiveUrl} class="absolute inset-0 w-full h-full bg-white"></iframe>
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
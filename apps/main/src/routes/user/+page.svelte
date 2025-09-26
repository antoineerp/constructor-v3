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
  let activeView = 'code'; // 'code' | 'render' | 'interactive'
  const compileCache = new Map(); // filename -> objectURL
  const interactiveCache = new Map(); // filename -> { url, ts }
  let interactiveUrl = '';
  let interactiveLoading = false;

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
        if(firstSvelte) activeView = 'render'; else activeView='code';
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
          <div class="w-60 border-r bg-gray-50 p-3 overflow-auto text-xs space-y-1">
            <div class="mb-2 text-[10px] text-gray-500 leading-snug">
              Fichiers générés. Sélectionne un fichier <span class="font-medium text-purple-600">.svelte</span> puis onglet
              <span class="font-medium">Rendu SSR</span> ou <span class="font-medium">Interactif</span> pour prévisualiser.
            </div>
            {#each Object.keys(appFiles) as f}
              {#key f}
                {@const meta = appValidation && appValidation[f]}
                <button
                  class="group relative flex items-center gap-1 w-full text-left px-2 py-1.5 rounded border text-[11px] break-all transition-colors
                    {appSelectedFile === f ? 'bg-white border-purple-400 text-purple-700 font-medium' : 'bg-white/70 hover:bg-white border-gray-200 text-gray-600'}"
                  on:click={() => selectFile(f)}
                  title={meta && meta.diagnostics?.length ? meta.diagnostics.map(d=>d.severity+': '+d.message).join('\n') : f}
                >
                  {#if f.endsWith('.svelte')}
                    <span class="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-purple-600 text-white text-[8px] font-bold">S</span>
                  {/if}
                  <span class="flex-1 truncate">{f}</span>
                  {#if meta}
                    {#if meta.diagnostics && meta.diagnostics.some(d=>d.severity==='error')}
                      <i class="fas fa-circle-exclamation text-red-500" title="Erreurs détectées"></i>
                    {:else if meta.ssrOk && meta.domOk}
                      <i class="fas fa-check-circle text-emerald-500" title="SSR & DOM OK"></i>
                    {:else if meta.ssrOk || meta.domOk}
                      <i class="fas fa-circle text-amber-500" title="Compilation partielle"></i>
                    {/if}
                  {/if}
                </button>
              {/key}
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
                <button
                  class="pb-2 border-b-2 -mb-px px-1 border-transparent text-gray-500 hover:text-gray-700 disabled:opacity-40"
                  class:border-purple-600={activeView==='interactive'}
                  class:text-purple-600={activeView==='interactive'}
                  on:click={()=> { if(appSelectedFile?.endsWith('.svelte')) activeView='interactive'; }}
                  disabled={!appSelectedFile || !appSelectedFile.endsWith('.svelte')}>Interactif</button>
              </div>
            </div>
            {#if activeView==='code'}
              <div class="flex-1 overflow-auto bg-gray-900 text-green-300 text-[11px] p-4 font-mono leading-relaxed">
                {#if appSelectedFile}
                  <pre><code>{(appValidation && appValidation[appSelectedFile]?.formatted) || appFiles[appSelectedFile]}</code></pre>
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
            {:else if activeView==='interactive'}
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
                    <iframe title="Sandbox Interactif" src={interactiveUrl} class="absolute inset-0 w-full h-full bg-white"></iframe>
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
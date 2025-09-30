<!-- Composant Preview de compilation Svelte -->
<script>
  import Card from '$lib/Card.svelte';
  
  export let previewCode = '';
  export let previewHtml = '';
  export let previewDomJs = '';
  export let previewSsrJs = '';
  export let previewLoading = false;
  export let previewError = '';
  export let previewStrict = false;
  export let previewDiagnostic = false;
  export let rawError = '';
  export let rawJsPreview = '';
  export let previewHeuristics = [];
  export let iframeKey = 0;
  export let fastPreview = true;
  export let fastStatus = 'idle';
  export let importWarnings = [];
  export let rewritesMeta = null;
  export let showDiff = false;
  export let diffBlocks = [];
  export let diffBlocksAll = [];
  // Multi-fichiers & timeline
  export let dependencies = {}; // { path: code }
  export let timeline = []; // [{runId,stage,t,extra}]
  export let currentRunId = null;
  // === Instrumentation forensic ===
  export let onForensicEvent = (e)=>{}; // callback(parent) reçoit {runId, stage, t, extra?}
  // (déplacé plus haut)
  export let readyTimeoutMs = 5000; // après HELLO sans READY
  export let loadTimeoutMs = 3000;  // après IFRAME_SET sans load
  // compileT0 retiré (non utilisé) – timing géré côté parent
  let iframeEl;
  let loadTimer; let readyTimer;
  let localRunId = null; // snapshot du runId pour annuler si mismatch

  function clearTimers(){ if(loadTimer){ clearTimeout(loadTimer); loadTimer=null;} if(readyTimer){ clearTimeout(readyTimer); readyTimer=null;} }

  $: if(currentRunId && currentRunId!==localRunId){
      // Nouveau run: réinitialise timers
      clearTimers();
      localRunId = currentRunId;
  }

  function stage(evt, extra){
    try { onForensicEvent && onForensicEvent({ runId: localRunId, stage: evt, t: performance.now(), extra }); } catch {}
  }

  function setupIframeInstrumentation(){
    if(!iframeEl) return;
    const myRun = localRunId;
    stage('IFRAME_SET');
    // Load timeout
    if(loadTimeoutMs>0){
      loadTimer = setTimeout(()=>{ if(myRun===localRunId) stage('IFRAME_LOAD_TIMEOUT'); }, loadTimeoutMs);
    }
    iframeEl.addEventListener('load', ()=>{
      if(myRun!==localRunId) return;
      stage('IFRAME_LOAD');
      if(loadTimer){ clearTimeout(loadTimer); loadTimer=null; }
      // Démarre timer READY (après HELLO)
      if(readyTimeoutMs>0){
        readyTimer = setTimeout(()=>{ if(myRun===localRunId) stage('READY_TIMEOUT'); }, readyTimeoutMs);
      }
    }, { once:true });
  }

  // Ecoute globale des messages HELLO/READY provenant de l'iframe
  function handleMessage(e){
    if(!e || !e.data || typeof e.data!== 'object') return;
    const d = e.data;
    if(!d.__previewSandbox) return; // signature
    if(d.runId !== localRunId) return; // ignorer anciens runs
    if(d.type==='HELLO'){
      stage('CHILD_HELLO');
    } else if(d.type==='READY'){
      stage('CHILD_READY'); if(readyTimer){ clearTimeout(readyTimer); readyTimer=null; }
    } else if(d.type==='ERROR'){
      stage('CHILD_ERROR', d.message);
    }
  }
  if(typeof window!=='undefined'){
    window.addEventListener('message', handleMessage);
  }
  import { onDestroy } from 'svelte';
  onDestroy(()=>{ clearTimers(); if(typeof window!=='undefined'){ window.removeEventListener('message', handleMessage);} });
  
  export let onRunPreview = () => {};
  export let onRunFastPreview = () => {};
  export let onLoadMoreDiff = () => {};
  export let onCopyHtml = () => {};
  export let onSetExample = (code) => {};
  // Events dépendances
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  function addDep(){ const p = prompt('Chemin dépendance (ex: deps/MyComp.svelte)'); if(p){ dispatch('addDependency', p); } }
  function editDep(p){ const cur = dependencies[p]; const nv = prompt('Code pour '+p, cur); if(nv!=null){ dispatch('updateDependency', { path:p, code:nv }); } }
  function removeDep(p){ if(confirm('Supprimer '+p+' ?')) dispatch('removeDependency', p); }
  
  let lineCount = (previewCode.match(/\n/g)||[]).length + 1;
  $: lineCount = (previewCode.match(/\n/g)||[]).length + 1;
  
  function setExampleCode() {
    onSetExample('<' + 'script>\n  let t = new Date().toLocaleTimeString();\n</' + 'script>\n<p>Horloge: {t}</p>');
  }
  
  function setMinimalCode() {
    onSetExample('<h1>Hello</h1>');
  }
</script>

<Card title="Preview Composant" subtitle="Compilation SSR + hydratation en direct">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-gray-700">Code Svelte</h3>
        <div class="flex items-center gap-3 text-xs">
          <label class="inline-flex items-center gap-1 cursor-pointer">
            <input type="checkbox" bind:checked={previewStrict}> 
            <span>Strict</span>
          </label>
          <label class="inline-flex items-center gap-1 cursor-pointer" title="Diagnostic brut compiler">
            <input type="checkbox" bind:checked={previewDiagnostic}> 
            <span>Diag</span>
          </label>
          <button 
            class="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40" 
            on:click={onRunPreview} 
            disabled={previewLoading}
          >
            {previewLoading ? 'Compilation...' : 'Compiler'}
          </button>
        </div>
      </div>
      
      <div class="relative">
        <textarea 
          class="w-full h-72 font-mono text-xs p-2 border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" 
          bind:value={previewCode}
        ></textarea>
        <div class="absolute bottom-1 right-2 text-[10px] text-gray-500 bg-white/70 px-1 rounded">
          {lineCount} l.
        </div>
      </div>

      <!-- Dépendances -->
      <details class="mt-3 text-[11px]" open>
        <summary class="cursor-pointer font-semibold text-gray-700 flex items-center gap-2">Dépendances <span class="text-[10px] font-normal text-gray-500">({Object.keys(dependencies).length})</span> <button type="button" class="ml-auto px-2 py-0.5 rounded bg-indigo-600 text-white" on:click|stopPropagation={addDep}>+ Fichier</button></summary>
        {#if Object.keys(dependencies).length===0}
          <div class="mt-1 text-gray-500">Aucune dépendance. Les imports relatifs détectés seront auto-créés.</div>
        {/if}
        <ul class="mt-2 space-y-1">
          {#each Object.keys(dependencies) as p}
            <li class="group border rounded px-2 py-1 bg-white flex items-center gap-2">
              <code class="text-[10px] text-gray-600 flex-1 truncate" title={p}>{p}</code>
              <button class="text-[10px] underline" on:click={()=> editDep(p)}>éditer</button>
              <button class="text-[10px] text-red-600 underline opacity-70 group-hover:opacity-100" on:click={()=> removeDep(p)}>x</button>
            </li>
          {/each}
        </ul>
      </details>
      
      {#if previewError}
        <div class="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {previewError}
        </div>
      {/if}
      
      {#if rawError}
        <div class="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-300 p-2 rounded">
          {rawError}
        </div>
      {/if}
      
      {#if rawJsPreview}
        <details class="mt-2 text-[10px]">
          <summary class="cursor-pointer text-gray-600">Voir JS SSR brut (tronc.)</summary>
          <label class="flex items-center gap-1">
            <input type="checkbox" bind:checked={fastPreview}> 
            <span>Fast preview</span>
          </label>
          <pre class="mt-1 max-h-40 overflow-auto bg-gray-900 text-[10px] text-gray-100 p-2 rounded">
            {rawJsPreview}
          </pre>
          {#if fastPreview}
            <button 
              class="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-40" 
              on:click={onRunFastPreview} 
              disabled={fastStatus==='compiling'}
            >
              {fastStatus==='compiling'?'Fast...':'Fast DOM'}
            </button>
          {/if}
        </details>
      {/if}
      
      {#if previewHeuristics.length}
        <div class="mt-3 text-[11px] text-gray-600 flex flex-wrap gap-1">
          {#each previewHeuristics as h}
            <span class="px-1.5 py-0.5 bg-gray-200 rounded">{h}</span>
          {/each}
        </div>
      {/if}

      <!-- Timeline forensic -->
      <details class="mt-4 text-[10px]" open>
        <summary class="cursor-pointer text-gray-700 font-semibold flex items-center gap-2">Timeline <span class="text-gray-500 font-normal">run {currentRunId || '—'}</span></summary>
        {#if !timeline.length}
          <div class="mt-1 text-gray-500">Aucun événement.</div>
        {:else}
          {#key currentRunId}
            <div class="mt-1 max-h-40 overflow-auto border rounded bg-gray-50 divide-y">
              {#each timeline.filter(e=> e.runId===currentRunId) as ev, i (i)}
                <div class="px-2 py-1 flex items-center gap-2">
                  <span class="text-[9px] text-gray-400">{(ev.t/1000).toFixed(3)}s</span>
                  <span class="text-[10px] font-mono">
                    {ev.stage}
                  </span>
                  {#if ev.extra}
                    <span class="text-[9px] text-gray-500 truncate" title={JSON.stringify(ev.extra)}>{JSON.stringify(ev.extra).slice(0,60)}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/key}
        {/if}
      </details>
      
      {#if importWarnings.length}
        <div class="mt-2 text-[10px] bg-amber-50 border border-amber-200 rounded p-2 text-amber-800">
          <div class="font-semibold mb-1">Import Warnings ({importWarnings.length})</div>
          <ul class="space-y-0.5 max-h-32 overflow-auto">
            {#each importWarnings as w}
              <li class="truncate" title={w}>{w}</li>
            {/each}
          </ul>
        </div>
      {/if}
      
      {#if rewritesMeta}
        <details class="mt-2 text-[10px]">
          <summary class="cursor-pointer text-gray-600">Réécritures Imports</summary>
          <pre class="mt-1 max-h-40 overflow-auto bg-gray-900 text-gray-100 p-2 rounded">
            {JSON.stringify(rewritesMeta, null, 2)}
          </pre>
        </details>
      {/if}
    </div>
    
    <div>
      <h3 class="text-sm font-semibold text-gray-700 mb-2">Résultat</h3>
      {#if previewHtml}
        <iframe
          bind:this={iframeEl}
          key={iframeKey}
          title="Preview composant"
          class="w-full h-72 border rounded bg-white"
          srcdoc={previewHtml}
          sandbox="allow-scripts allow-same-origin"
          referrerpolicy="no-referrer"
          on:load={() => { /* load capturé via addEventListener */ }}
        ></iframe>
        {@html '' /* Force Svelte à considérer changement pour runId */}
        {#key iframeKey}
          {#await (async()=>{ setupIframeInstrumentation(); return true; })()}
            <span class="hidden"></span>
          {:then}
            <span class="hidden"></span>
          {/await}
        {/key}
      {:else}
        <div class="w-full h-72 border rounded bg-gray-50 grid place-items-center text-xs text-gray-500">
          Aucun rendu (compiler pour voir)
        </div>
      {/if}
      
      <div class="mt-2 flex gap-2 text-[10px] text-gray-500">
        <button class="underline" on:click={onCopyHtml}>Copier HTML</button>
        <button class="underline" on:click={setExampleCode}>
          Exemple simple
        </button>
        <button class="underline" on:click={setMinimalCode}>
          Minimal
        </button>
        {#if previewSsrJs && previewDomJs}
          <button class="underline" on:click={() => showDiff = !showDiff}>
            {showDiff? 'Masquer diff':'Diff SSR/Fast'}
          </button>
        {/if}
      </div>
      
      {#if showDiff}
        <div class="mt-3 border rounded bg-gray-900 text-gray-100 max-h-64 overflow-auto text-[10px] p-2">
          <div class="mb-1 text-xs text-blue-300 flex items-center justify-between">
            <span>Diff (lignes divergentes) – gauche=SSR, droite=DOM</span>
            <span class="text-gray-400">{diffBlocks.length}/{diffBlocksAll.length}</span>
          </div>
          {#each diffBlocks as d}
            <div class="grid grid-cols-2 gap-2 mb-1">
              <div>
                <span class="text-amber-400">{d.i}</span> <code class="break-all">{d.left}</code>
              </div>
              <div>
                <span class="text-amber-400">{d.i}</span> <code class="break-all">{d.right}</code>
              </div>
            </div>
          {/each}
          {#if !diffBlocks.length}
            <div class="text-gray-400">Aucune différence détectée.</div>
          {/if}
          {#if diffBlocksAll.length > diffBlocks.length}
            <div class="mt-2">
              <button class="px-2 py-1 rounded bg-indigo-600 text-white" on:click={onLoadMoreDiff}>
                Charger plus
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</Card>
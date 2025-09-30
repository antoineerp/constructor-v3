<script>
  import { onMount, onDestroy } from 'svelte';

  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import Input from '$lib/Input.svelte';
  import Modal from '$lib/Modal.svelte';
  import { listPromptTemplates } from '$lib/prompt/promptLibrary.js';
  
  // Import des composants admin modulaires
  import {
    DashboardTab,
    ProjectsTab,
    TemplatesTab,
    ComponentsTab,
    AITab,
    PreviewTab,
    PromptsTab,
    ExternalsTab,
    DiagnosticTab
  } from '$lib/admin';
  // Chargement librairies externes (ingérées localement)
  let externalLibs = []; let externalLoading = false; let externalError='';
  async function loadExternalLibs(){
    externalLoading = true; externalError='';
    try {
  const r = await fetch('/api/external/list', { headers:{'Cache-Control':'no-store','X-Req-Id':'admin-ext-'+Date.now()} });
      if(!r.ok){ throw new Error('HTTP '+r.status); }
      const j = await r.json(); externalLibs = j.libraries || [];
    } catch(e){ externalError = e.message; externalLibs = []; }
    finally { externalLoading = false; }
  }

  let activeTab = 'dashboard';
  let promptTemplates = [];
  function loadPrompts(){
    try { promptTemplates = listPromptTemplates(); } catch { promptTemplates = []; }
  }
  // Preview ad-hoc (C)
  let previewCode = `<script>\n  export let label = 'Bouton';\n  let count = 0;\n  function inc(){ count++; }\n<\/script>\n\n<button class=\"px-4 py-2 bg-blue-600 text-white rounded\" on:click={inc}>{label} {count}</button>`;
  let previewHtml = '';
  let previewDomJs = ''; // JS DOM hydratation renvoyé par endpoint (extraction base64)
  let previewSsrJs = ''; // JS SSR original (pour diff logique)
  let previewLoading = false;
  let previewError = '';
  let previewStrict = false;
  let previewDiagnostic = false; // déclenche raw compile avant SSR
  let rawError = '';
  let rawJsPreview = '';
  let previewHeuristics = [];
  let iframeKey = 0; // force reload iframe
  let fastPreview = true; // active le mode compilation rapide worker
  let fastStatus = 'idle'; // idle|compiling|error|ok
  let importWarnings = [];
  let rewritesMeta = null;

  // Chargement du worker compileRapid dynamiquement (évite bundling si non utilisé)
  let compileRapidFn;
  async function ensureRapid(){
    if(!compileRapidFn){
      try { const mod = await import('../../lib/compile/rapidCompiler.ts'); compileRapidFn = mod.compileRapid; }
      catch(e){ console.warn('Rapid compiler indisponible', e); }
    }
    return compileRapidFn;
  }

  let lastFastBlob = null;
  async function runFastPreview(){
    fastStatus = 'compiling'; importWarnings = []; rewritesMeta=null; fastError='';
    try {
      // En production, utiliser l'API standard au lieu du rapid compiler
      if(typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        // Fallback vers l'API standard pour production Vercel
        await runPreview();
        fastStatus = 'ok';
        return;
      }
      
      const rapid = await ensureRapid();
      if(!rapid) {
        // Fallback vers l'API standard si rapid non disponible
        await runPreview();
        fastStatus = 'ok';
        return;
      }
      
      const res = await rapid(previewCode, 'Component.svelte');
      if(!res.ok) throw new Error(res.error||'Erreur compileRapid');
      let jsCode = res.js || '';
      const cssCode = res.css || '';
  // Réécriture basique des imports relatifs -> /runtime/fast/<path>
  jsCode = jsCode.replace(/import\s+([^;]+?)from\s+['"](\.\.\/|\.\/)([^'"\n]+)['"];?/g, (m, what, pre, p)=> `import ${what}from '/runtime/fast/${p.replace(/^\.\//,'')}'`);
  const bootstrap = `\n;(()=>{function pickExport(mod){let C=mod.Component||mod.default||mod.App||mod; if(C&&C.default) C=C.default; return C;} try{const C=pickExport(globalThis); if(typeof C!=='function') throw new Error('Export composant introuvable'); const target = document.getElementById('app'); if(!target) throw new Error('Target element not found'); if(!(target instanceof Element)) throw new Error('Target is not a DOM element'); new C({ target, props:{ label:'Fast'} });}catch(e){ try{ const pre=document.createElement('pre'); pre.style.cssText='color:#b91c1c;font:12px monospace;white-space:pre-wrap;padding:8px'; pre.textContent='Fast preview error: '+(e.message||e); if(document && document.body && typeof document.body.appendChild==='function'){ document.body.innerHTML=''; document.body.appendChild(pre); } else { console.error('DOM manipulation failed:', e); } }catch(fallbackError){ console.error('Complete preview failure:', e, fallbackError); } }} )();`;
      
      // En production, éviter les blobs qui ne fonctionnent pas bien avec la CSP
      if(typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.protocol === 'https:')) {
        // Fallback: utiliser l'API standard pour l'affichage
        await runPreview();
        fastStatus = 'ok';
        return;
      }
      
      if(lastFastBlob){ try { URL.revokeObjectURL(lastFastBlob); } catch{} }
      const html = ['<!DOCTYPE html><html><head><meta charset="utf-8"><style>', cssCode, '</style></head><body>','<div id="app"></div>','<scr'+'ipt type="module">',jsCode,bootstrap,'</scr'+'ipt></body></html>'].join('');
      const blobHtml = new Blob([html], { type:'text/html' });
      lastFastBlob = URL.createObjectURL(blobHtml);
      fastIframeSrc = lastFastBlob; fastStatus='ok';
    } catch(e){ 
      fastStatus='error'; 
      fastError=e.message; 
      console.error('Fast preview error:', e);
      // Fallback vers preview standard en cas d'erreur
      try {
        await runPreview();
        if(!previewError) fastStatus = 'ok';
      } catch(fallbackError) {
        console.error('Fallback preview also failed:', fallbackError);
      }
    }
  }

  let fastIframeSrc = '';
  let lineCount = (previewCode.match(/\n/g)||[]).length + 1;
  let fastError = '';
  async function runPreview(){
    if(previewAbort){ try { previewAbort.abort(); } catch{} }
    previewAbort = new AbortController();
    const signal = previewAbort.signal;
    previewLoading = true; previewError=''; previewHeuristics=[]; rawError=''; rawJsPreview='';
    const started = Date.now();
    const timeout = setTimeout(()=>{ if(!signal.aborted){ previewError = 'Timeout (>20s)'; previewLoading=false; pushToast('Timeout compilation','error'); } }, 20000);
    try {
      if(previewDiagnostic && !signal.aborted){
        try {
          const rRaw = await fetch('/api/compile/raw', { method:'POST', headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ code: previewCode, generate:'ssr' }), signal });
          if(rRaw.ok){ const jRaw = await rRaw.json(); rawJsPreview = (jRaw.js||'').slice(0,3000); if(jRaw.rewrites){ rewritesMeta=jRaw.rewrites; importWarnings=jRaw.rewrites.warnings||[]; } } else { try { const j=await rRaw.json(); rawError='[raw] '+(j.error||rRaw.status); } catch { rawError='[raw] HTTP '+rRaw.status; } }
        } catch(e){ if(!signal.aborted) rawError='[raw] '+e.message; }
      }
      if(signal.aborted) return;
      const r = await fetch('/api/compile/component', { method:'POST', headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ code: previewCode, debug:true, strict: previewStrict, enableRendererNormalization:false }), signal });
      if(signal.aborted) return;
      if(!r.ok){
        let msg = 'HTTP '+r.status;
        try { const txt = await r.text(); try { const j=JSON.parse(txt); msg = j.error||j.message||msg; } catch { msg = txt.slice(0,180)||msg; } } catch{}
        previewError = msg; pushToast('Erreur: '+msg,'error');
        return;
      }
      const j = await r.json();
      if(!j.success){ previewError = j.error||'Compilation échouée'; pushToast('Compilation échouée','error'); return; }
      const inject = `<scr`+`ipt>(function(){try{if(window.__HYDRATION_BRIDGE)return;window.__HYDRATION_BRIDGE=1;document.addEventListener('component-hydration-error',function(e){try{parent&&parent.postMessage&&parent.postMessage({type:'hydration-error',message:(e.detail&&e.detail.message)||e.detail||'Hydration error'},'*');}catch(_e){}});}catch(_e){}})();</scr`+`ipt>`;
      previewHtml = (j.html||'') + inject;
      previewHeuristics = j.meta?.heuristics||[];
      previewSsrJs = j.ssrJs||''; previewDomJs = j.domJs||''; iframeKey++;
      const dur = Date.now()-started; if(dur>1500) pushToast('Compile '+dur+'ms','info');
    } catch(e){ if(!signal.aborted){ previewError = e.name==='AbortError' ? 'Annulé' : e.message; pushToast('Exception: '+previewError,'error'); } }
    finally { clearTimeout(timeout); if(!signal.aborted) previewLoading=false; }
  }

  // Diff SSR vs Fast (DOM) – pagination
  let showDiff = false;
  let diffLimit = 200;
  $: diffBlocksAll = showDiff ? computeDiff(previewSsrJs, previewDomJs) : [];
  $: diffBlocks = diffBlocksAll.slice(0, diffLimit);
  function computeDiff(a, b){
    if(!a || !b) return [];
    const al = a.split(/\n/); const bl = b.split(/\n/);
    const max = Math.max(al.length, bl.length); const out=[];
    for(let i=0;i<max;i++){
      const L = al[i]||''; const R = bl[i]||'';
      if(L!==R) out.push({ i:i+1, left:L, right:R });
    }
    return out;
  }
  function loadMoreDiff(){ diffLimit += 200; }

  // ===== Overlay Hydration =====
  let hydrationMessage = '';
  let overlayVisible = false;
  let hydrationBridgeFlag = false;
  function showHydrationError(msg){
    hydrationMessage = msg;
    overlayVisible = true;
    const el = document.getElementById('hydration-overlay');
    const msgEl = document.getElementById('hydration-overlay-msg');
    if(el&&msgEl){ msgEl.textContent = msg; el.classList.remove('hidden'); }
  }
  function hideOverlay(){ overlayVisible=false; const el = document.getElementById('hydration-overlay'); if(el){ el.classList.add('hidden'); } }
  let messageHandler;
  onMount(()=>{
    if(!hydrationBridgeFlag){
      hydrationBridgeFlag = true;
  // Correction typo: écouter correctement 'hydration-error' (ancienne faute 'hydrration-error' conservée pour compat retro)
  messageHandler = (e)=>{ try { if(e.data && (e.data.type==='hydration-error' || e.data.type==='hydrration-error')){ showHydrationError(e.data.message); } } catch{} };
      window.addEventListener('message', messageHandler);
    }
  });
  onDestroy(()=>{ if(messageHandler) window.removeEventListener('message', messageHandler); if(lastFastBlob){ try{ URL.revokeObjectURL(lastFastBlob);}catch{} } });

  // Toast system
  let toasts = [];
  function pushToast(msg, type='info', ttl=4000){
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, msg, type }];
    setTimeout(()=>{ toasts = toasts.filter(t=> t.id!==id); }, ttl);
  }

  // ====== IA ======
  import AiStatusBadge from '$lib/AiStatusBadge.svelte';
  let aiList = []; let aiMap = {}; let aiLoading=false; let aiAny=false; let aiDetail={};
  async function loadAIStatus() {
    aiLoading = true;
    try {
  const r = await fetch('/api/ai/status', { headers:{'Cache-Control':'no-store','X-Req-Id':'admin-ai-'+Date.now()} });
      const j = await r.json();
      if(j.list){ aiList = j.list; }
      aiMap = j.providers || {}; aiAny = !!j.any; aiDetail = j.detail||{};
    } catch (e) {
      aiList = [{ id:'error', connected:false, maskedKey: e.message }];
      aiMap = {}; aiAny=false;
    } finally { aiLoading=false; }
  }

  // ====== SUPABASE ======

  // ====== DATA DASHBOARD ======
  // Données (offline, remplacent Supabase)
  let stats = { totalProjects: 0, totalPrompts: 0, totalTemplates: 0, totalComponents: 0 };
  let projects = [];
  let templates = [];
  let components = [];
  let usageStats = [];
  let catalogLoading = false; let catalogError='';

  // ====== DIAGNOSTIC ======
  let diagnosticData = null; let diagnosticLoading = false; let diagnosticError = '';
  async function loadDiagnostic(){
    diagnosticLoading = true; diagnosticError = '';
    try {
      const r = await fetch('/api/diagnostic/compile', { headers:{'Cache-Control':'no-store','X-Req-Id':'admin-diag-'+Date.now()} });
      if(!r.ok) throw new Error('HTTP '+r.status);
      diagnosticData = await r.json();
    } catch(e){ diagnosticError = e.message; diagnosticData = null; }
    finally { diagnosticLoading = false; }
  }

  // ====== MODALES ======
  let showNewTemplateModal = false;
  let showNewComponentModal = false;
  let newTemplate = { name: '', type: 'e-commerce', description: '', structure: '' };
  let newComponent = { name: '', type: 'button', category: 'ui', code: '' };

  onMount(async () => {
    await refreshCatalog();
    await loadAIStatus();
  });

  async function refreshCatalog(){
    catalogLoading = true; catalogError='';
    try {
  const r = await fetch('/api/catalog', { headers:{'Cache-Control':'no-store','X-Req-Id':'admin-catalog-'+Date.now()} });
      if(!r.ok) throw new Error('HTTP '+r.status);
      const j = await r.json();
      if(!j.success) throw new Error(j.error||'Échec catalog');
      templates = j.templates || [];
      components = j.components || [];
      projects = j.projects || [];
      // Synthèse stats (usageStats non disponible offline)
      stats = {
        totalProjects: projects.length,
        totalPrompts: 0,
        totalTemplates: templates.length,
        totalComponents: components.length
      };
    } catch(e){ catalogError = e.message; }
    finally { catalogLoading = false; }
  }

  async function createTemplate() {
    if (!newTemplate.name || !newTemplate.description) return;
    try {
      let structure;
      try { structure = JSON.parse(newTemplate.structure || '{}'); } catch { structure = { routes: [], components: [], features: [] }; }
      const res = await fetch('/api/catalog', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: newTemplate.name, type: newTemplate.type, description: newTemplate.description, structure }) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Échec création');
      newTemplate = { name: '', type: 'e-commerce', description: '', structure: '' };
      showNewTemplateModal = false;
      await refreshCatalog();
  } catch (error) { pushToast('Erreur création template: '+ error.message, 'error'); }
  }

  async function createComponent() {
    if (!newComponent.name || !newComponent.code) return;
    try {
      const comp = { id: 'cmp_'+Date.now().toString(36), name: newComponent.name, type: newComponent.type, category: newComponent.category, code: newComponent.code, created_at: Date.now() };
      // Pas d'endpoint dédié: injection locale (volatil)
      components = [comp, ...components];
      stats.totalComponents = components.length;
      newComponent = { name: '', type: 'button', category: 'ui', code: '' };
      showNewComponentModal = false;
  } catch (error) { pushToast('Erreur création composant: '+ error.message, 'error'); }
  }

  function formatDate(dateString) { return new Date(dateString).toLocaleDateString('fr-FR'); }
  function getStatusBadge(status) {
    const badges = { draft: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', published: 'bg-blue-100 text-blue-800' };
    return badges[status] || 'bg-gray-100 text-gray-800';
  }
  function shortId(id){ return id ? String(id).slice(0,8) : ''; }
  function formatBytes(n){ if(!n && n!==0) return ''; const u=['B','KB','MB','GB']; let i=0, v=n; while(v>=1024 && i<u.length-1){ v/=1024; i++; } return (i? v.toFixed(1): v)+' '+u[i]; }

  let lastBlobUrl = '';
  async function savePreviewToBlob(){
    try {
      const body = { content: previewHtml || '<!--vide-->', path: 'previews/preview-'+Date.now()+'.html', contentType:'text/html' };
      const r = await fetch('/api/blob/put', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const j = await r.json();
      if(!r.ok || !j.success){ pushToast('Échec blob: '+(j.error||r.status),'error'); return; }
      lastBlobUrl = j.url; pushToast('Preview sauvegardée','success');
    } catch(e){ pushToast('Blob err: '+e.message,'error'); }
  }
</script>

<svelte:head>
  <title>Administration - Constructor V3</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header Admin -->
  <div class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Administration</h1>
          <p class="text-sm text-gray-600">Tableau de bord Constructor V3</p>
        </div>
        
        <div class="flex items-center space-x-4">
          <div class="hidden sm:block"><AiStatusBadge loading={aiLoading} providers={aiMap} /></div>
          <Button variant="secondary" size="sm" on:click={loadAIStatus} title="Rafraîchir statut IA">
            <i class="fas fa-download mr-2"></i>
            Exporter Données
          </Button>
          <Button size="sm">
            <i class="fas fa-sync mr-2"></i>
            Actualiser
          </Button>
        </div>
      </div>

        {#if toasts.length}
          <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-64">
            {#each toasts as t}
              <div class="px-3 py-2 rounded text-xs shadow bg-white border animate-fade-in"
                class:border-red-300={t.type==='error'} class:text-red-700={t.type==='error'}
                class:border-green-300={t.type==='success'} class:text-green-700={t.type==='success'}
                class:border-gray-200={t.type!=='error' && t.type!=='success'} class:text-gray-700={t.type!=='error' && t.type!=='success'}
                role="status">
                {t.msg}
              </div>
            {/each}
          </div>
        {/if}
    </div>
  </div>
  
  <!-- Navigation Onglets -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8">
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => activeTab = 'dashboard'}
        >
          <i class="fas fa-chart-line mr-2"></i>
          Dashboard
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'projects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => activeTab = 'projects'}
        >
          <i class="fas fa-folder mr-2"></i>
          Projets ({stats.totalProjects})
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'templates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => activeTab = 'templates'}
        >
          <i class="fas fa-layer-group mr-2"></i>
          Templates ({stats.totalTemplates})
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'components' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => activeTab = 'components'}
        >
          <i class="fas fa-puzzle-piece mr-2"></i>
          Composants ({stats.totalComponents})
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'ai' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => { activeTab = 'ai'; loadAIStatus(); }}
        >
          <i class="fas fa-robot mr-2"></i>
          IA
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'preview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => { activeTab = 'preview'; }}
        >
          <i class="fas fa-eye mr-2"></i>
          Preview
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'prompts' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => { activeTab = 'prompts'; loadPrompts(); }}
        >
          <i class="fas fa-paragraph mr-2"></i>
          Prompts
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'externals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => { activeTab = 'externals'; loadExternalLibs(); }}
        >
          <i class="fas fa-boxes-stacked mr-2"></i>
          Librairies
        </button>
        <button
          class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'diagnostic' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
          on:click={() => { activeTab = 'diagnostic'; loadDiagnostic(); }}
        >
          <i class="fas fa-stethoscope mr-2"></i>
          Diagnostic
        </button>
      </nav>
    </div>
  </div>
  
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Dashboard -->
    {#if activeTab === 'dashboard'}
      <DashboardTab 
        {stats} 
        {projects} 
        {usageStats} 
        {getStatusBadge} 
        {formatDate} 
        {shortId} 
        {pushToast} 
      />
    {/if}

    {#if activeTab === 'externals'}
      <ExternalsTab 
        {externalLibs} 
        {externalLoading} 
        {externalError} 
        {formatBytes} 
        on:copyCode={(e) => navigator.clipboard.writeText(e.detail)}
        on:previewCode={(e) => { previewCode = e.detail; activeTab = 'preview'; }}
      />
    {/if}


    {#if activeTab === 'ai'}
      <AITab 
        {aiList} 
        {aiMap} 
        {aiLoading} 
        on:refresh={loadAIStatus}
      />
    {/if}

    {#if activeTab === 'preview'}
      <PreviewTab 
        bind:previewCode
        {previewHtml}
        {previewLoading}
        {previewError}
        {previewStrict}
        {previewDiagnostic}
        {rawError}
        {rawJsPreview}
        {fastPreview}
        {fastStatus}
        {previewHeuristics}
        {importWarnings}
        {rewritesMeta}
        {iframeKey}
        {showDiff}
        {diffBlocks}
        {diffBlocksAll}
        {previewSsrJs}
        {previewDomJs}
        {lineCount}
        on:compile={runPreview}
        on:fastCompile={runFastPreview}
        on:toggleDiff={() => showDiff = !showDiff}
        on:loadMoreDiff={loadMoreDiff}
        on:setSimpleExample={(e) => previewCode = e.detail}
      />
    {/if}

    {#if activeTab === 'prompts'}
      <PromptsTab {promptTemplates} />
    {/if}

    {#if activeTab === 'diagnostic'}
      <DiagnosticTab 
        {diagnosticData} 
        {diagnosticLoading} 
        {diagnosticError} 
        {formatBytes}
        on:load={loadDiagnostic}
      />
    {/if}
    
    <!-- Gestion des Projets -->
    {#if activeTab === 'projects'}
      <ProjectsTab 
        {projects} 
        {getStatusBadge} 
        {formatDate} 
        {shortId} 
        {pushToast}
      />
    {/if}
    
    <!-- Gestion des Templates -->
    {#if activeTab === 'templates'}
      <TemplatesTab 
        {templates} 
        on:newTemplate={() => showNewTemplateModal = true}
      />
    {/if}
    
    <!-- Gestion des Composants -->
    {#if activeTab === 'components'}
      <ComponentsTab 
        {components} 
        on:newComponent={() => showNewComponentModal = true}
      />
    {/if}
  </div>
</div>

<!-- Modal Nouveau Template -->
<Modal bind:open={showNewTemplateModal} title="Nouveau Template" size="lg">
  <form id="template-form" on:submit|preventDefault={createTemplate}>
    <div class="space-y-4">
      <Input
        label="Nom du template"
        placeholder="Site E-commerce Modern"
        bind:value={newTemplate.name}
        required
      />
      
      <div>
  <label for="template-type" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
  <select id="template-type"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          bind:value={newTemplate.type}
        >
          <option value="e-commerce">E-commerce</option>
          <option value="blog">Blog</option>
          <option value="portfolio">Portfolio</option>
          <option value="crm">CRM</option>
          <option value="dashboard">Dashboard</option>
          <option value="landing-page">Landing Page</option>
        </select>
      </div>
      
      <div>
        <label for="template-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          id="template-description"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Description du template..."
          bind:value={newTemplate.description}
          rows="3"
          required
        ></textarea>
      </div>
      
      <div>
        <label for="template-structure" class="block text-sm font-medium text-gray-700 mb-1">Structure (JSON)</label>
        <textarea
          id="template-structure"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder={'{"routes": [], "components": [], "features": []}'}
          bind:value={newTemplate.structure}
          rows="6"
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">Structure JSON définissant les routes, composants et fonctionnalités</p>
      </div>
    </div>
  </form>
  
  <div slot="footer" class="flex justify-end space-x-3 p-6 border-t border-gray-200">
    <Button variant="secondary" on:click={() => showNewTemplateModal = false}>
      Annuler
    </Button>
    <Button type="submit" form="template-form">
      <i class="fas fa-plus mr-2"></i>
      Créer Template
    </Button>
  </div>
</Modal>

<!-- Modal Nouveau Composant -->
<Modal bind:open={showNewComponentModal} title="Nouveau Composant" size="xl">
  <form id="component-form" on:submit|preventDefault={createComponent}>
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nom du composant"
          placeholder="ButtonModern"
          bind:value={newComponent.name}
          required
        />
        
        <div>
          <label for="component-type" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select id="component-type"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            bind:value={newComponent.type}
          >
            <option value="button">Button</option>
            <option value="input">Input</option>
            <option value="card">Card</option>
            <option value="modal">Modal</option>
            <option value="header">Header</option>
            <option value="footer">Footer</option>
            <option value="form">Form</option>
          </select>
        </div>
      </div>
      
      <div>
  <label for="component-category" class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
  <select id="component-category"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          bind:value={newComponent.category}
        >
          <option value="ui">UI</option>
          <option value="layout">Layout</option>
          <option value="form">Form</option>
          <option value="navigation">Navigation</option>
          <option value="display">Display</option>
        </select>
      </div>
      
      <div>
  <label for="component-code" class="block text-sm font-medium text-gray-700 mb-1">Code Svelte</label>
  <textarea id="component-code"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="&lt;script&gt;\n  // Props et logique\n&lt;/script&gt;\n\n&lt;button&gt;\n  &lt;slot /&gt;\n&lt;/button&gt;"
          bind:value={newComponent.code}
          rows="12"
          required
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">Code complet du composant Svelte</p>
      </div>
    </div>
  </form>
    
  <div slot="footer" class="flex justify-end space-x-3 p-6 border-t border-gray-200">
    <Button variant="secondary" on:click={() => showNewComponentModal = false}>
      Annuler
    </Button>
    <Button form="component-form" type="submit">
      <i class="fas fa-plus mr-2"></i>
      Créer Composant
    </Button>
  </div>
</Modal>

<!-- Ajout bandeau erreur preview -->
{#if activeTab==='preview'}
  {#if previewError}
    <div class="max-w-7xl mx-auto px-4 -mt-4 mb-4">
      <div class="p-3 rounded border border-red-300 bg-red-50 text-red-700 text-xs flex items-start gap-3">
        <i class="fas fa-triangle-exclamation mt-0.5"></i>
        <div class="flex-1">
          <strong class="font-semibold">Erreur Preview:</strong> {previewError}
          {#if rawError}<div class="mt-1 opacity-80">{rawError}</div>{/if}
          <div class="mt-1 flex gap-2 flex-wrap">
            <button class="underline" on:click={runPreview}>Relancer</button>
            <button class="underline" on:click={savePreviewToBlob}>Sauvegarder sur Blob</button>
            {#if lastBlobUrl}<a class="underline text-blue-700" href={lastBlobUrl} target="_blank" rel="noopener">Ouvrir Blob</a>{/if}
          </div>
        </div>
  <button class="text-xs" on:click={()=> previewError=''}>&times;</button>
      </div>
    </div>
  {/if}
{/if}
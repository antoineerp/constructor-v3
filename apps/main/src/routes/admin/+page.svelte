<script>
  import { onMount, onDestroy } from 'svelte';

  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import Input from '$lib/Input.svelte';
  import Modal from '$lib/Modal.svelte';
  import { listPromptTemplates } from '$lib/prompt/promptLibrary.js';
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
    fastStatus = 'compiling'; importWarnings = []; rewritesMeta=null;
    try {
      const rapid = await ensureRapid();
      if(!rapid) throw new Error('compileRapid non chargé');
      const res = await rapid(previewCode, 'Component.svelte');
      if(!res.ok) throw new Error(res.error||'Erreur compileRapid');
      let jsCode = res.js || '';
      const cssCode = res.css || '';
  // Réécriture basique des imports relatifs -> /runtime/fast/<path>
  jsCode = jsCode.replace(/import\s+([^;]+?)from\s+['"](\.\.\/|\.\/)([^'"\n]+)['"];?/g, (m, what, pre, p)=> `import ${what}from '/runtime/fast/${p.replace(/^\.\//,'')}'`);
  const bootstrap = `\n;(()=>{function pickExport(mod){let C=mod.Component||mod.default||mod.App||mod; if(C&&C.default) C=C.default; return C;} try{const C=pickExport(globalThis); if(typeof C!=='function') throw new Error('Export composant introuvable'); const target = document.getElementById('app'); if(!target) throw new Error('Target element not found'); if(!(target instanceof Element)) throw new Error('Target is not a DOM element'); new C({ target, props:{ label:'Fast'} });}catch(e){ try{ const pre=document.createElement('pre'); pre.style.cssText='color:#b91c1c;font:12px monospace;white-space:pre-wrap;padding:8px'; pre.textContent='Fast preview error: '+(e.message||e); if(document && document.body && typeof document.body.appendChild==='function'){ document.body.innerHTML=''; document.body.appendChild(pre); } else { console.error('DOM manipulation failed:', e); } }catch(fallbackError){ console.error('Complete preview failure:', e, fallbackError); } }} )();`;
      if(lastFastBlob){ try { URL.revokeObjectURL(lastFastBlob); } catch{} }
      const html = ['<!DOCTYPE html><html><head><meta charset="utf-8"><style>', cssCode, '</style></head><body>','<div id="app"></div>','<scr'+'ipt type="module">',jsCode,bootstrap,'</scr'+'ipt></body></html>'].join('');
      const blobHtml = new Blob([html], { type:'text/html' });
      lastFastBlob = URL.createObjectURL(blobHtml);
      fastIframeSrc = lastFastBlob; fastStatus='ok';
    } catch(e){ fastStatus='error'; fastError=e.message; }
  }

  let fastIframeSrc = '';
  let lineCount = (previewCode.match(/\n/g)||[]).length + 1;
  let fastError = '';
  async function runPreview(){
    previewLoading = true; previewError=''; previewHeuristics=[]; rawError=''; rawJsPreview='';
    try {
      if(previewDiagnostic){
  const rRaw = await fetch('/api/compile/raw', { method:'POST', headers:{'Content-Type':'application/json','Cache-Control':'no-store'}, body: JSON.stringify({ code: previewCode, generate:'ssr' }) });
        if(!rRaw.ok){
          try { const j = await rRaw.json(); rawError = '[raw] '+(j.error||'Erreur inconnue'); } catch { rawError='[raw] Erreur compilation'; }
        } else {
          const jRaw = await rRaw.json(); rawJsPreview = (jRaw.js||'').slice(0,3000);
          if(jRaw.rewrites){ rewritesMeta = jRaw.rewrites; importWarnings = jRaw.rewrites.warnings||[]; }
        }
      }
  const r = await fetch('/api/compile/component', { method:'POST', headers:{ 'Content-Type':'application/json','Cache-Control':'no-store' }, body: JSON.stringify({ code: previewCode, debug:true, strict: previewStrict, enableRendererNormalization:false }) });
      if(!r.ok){
        let txt = await r.text();
        try { const j = JSON.parse(txt); previewError = j.error || ('HTTP '+r.status); } catch { previewError = txt.slice(0,400); }
        return;
      }
      const j = await r.json();
      // Inject listener pour relayer les erreurs d'hydratation vers parent
  const inject = `<scr` + `ipt>(function(){try{if(window.__HYDRATION_BRIDGE)return;window.__HYDRATION_BRIDGE=1;window.addEventListener('component-hydration-error',function(e){try{parent&&parent.postMessage&&parent.postMessage({type:'hydration-error',message:(e.detail&&e.detail.message)||e.detail||'Hydration error'},'*');}catch(_e){}});}catch(_e){}})();</scr` + `ipt>`;
      previewHtml = (j.html || '') + inject;
      previewHeuristics = j.meta?.heuristics || [];
      previewSsrJs = j.ssrJs || '';
      previewDomJs = j.domJs || '';
      iframeKey++; // changer clé pour recharger
    } catch(e){
      previewError = e.message;
    } finally {
      previewLoading = false;
    }
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
      <!-- Statistiques principales -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 rounded-lg mr-4">
              <i class="fas fa-project-diagram text-blue-600 text-2xl"></i>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
              <p class="text-sm text-gray-600">Projets Créés</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div class="flex items-center">
            <div class="p-3 bg-green-100 rounded-lg mr-4">
              <i class="fas fa-comment-dots text-green-600 text-2xl"></i>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{stats.totalPrompts}</p>
              <p class="text-sm text-gray-600">Prompts Traités</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div class="flex items-center">
            <div class="p-3 bg-purple-100 rounded-lg mr-4">
              <i class="fas fa-layer-group text-purple-600 text-2xl"></i>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{stats.totalTemplates}</p>
              <p class="text-sm text-gray-600">Templates Disponibles</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div class="flex items-center">
            <div class="p-3 bg-orange-100 rounded-lg mr-4">
              <i class="fas fa-puzzle-piece text-orange-600 text-2xl"></i>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{stats.totalComponents}</p>
              <p class="text-sm text-gray-600">Composants</p>
            </div>
          </div>
        </Card>
      </div>
      
      <!-- Activité récente -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Projets Récents" subtitle="5 derniers projets créés">
          <div class="space-y-4">
            {#each projects.slice(0, 5) as project}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900 flex items-center gap-2">{project.name}{#if project.id}<button class="text-[10px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300" title={project.id} on:click={() => { navigator.clipboard.writeText(project.id); pushToast('ID copié'); }}>{shortId(project.id)}</button>{/if}</p>
                  <p class="text-sm text-gray-600">{project.description || 'Pas de description'}</p>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusBadge(project.status)}">
                  {project.status}
                </span>
              </div>
            {/each}
            {#if projects.length === 0}
              <p class="text-gray-500 text-center py-4">Aucun projet créé</p>
            {/if}
          </div>
        </Card>
        
        <Card title="Statistiques d'Usage" subtitle="7 derniers jours">
          <div class="space-y-4">
            {#each usageStats as stat}
              <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p class="font-medium text-gray-900">{formatDate(stat.date)}</p>
                  <p class="text-sm text-gray-600">{stat.total_prompts || 0} prompts</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-blue-600">{stat.total_projects || 0}</p>
                  <p class="text-xs text-gray-500">projets</p>
                </div>
              </div>
            {/each}
            {#if usageStats.length === 0}
              <p class="text-gray-500 text-center py-4">Aucune statistique disponible</p>
            {/if}
          </div>
        </Card>
      </div>
    {/if}

    {#if activeTab === 'externals'}
      <Card title="Librairies Externes" subtitle="Composants ingérés localement (offline)">
        {#if externalLoading}
          <p class="text-sm text-gray-500">Chargement...</p>
        {:else if externalError}
          <p class="text-sm text-red-600">Erreur: {externalError}</p>
        {:else if !externalLibs.length}
          <p class="text-sm text-gray-500">Aucune librairie ingérée. Utilisez tools/ingest-external.mjs pour en ajouter.</p>
        {:else}
          <div class="space-y-6">
            {#each externalLibs as lib}
              <div class="border rounded-lg bg-white shadow-sm">
                <div class="px-4 py-3 flex items-center justify-between border-b bg-gray-50 rounded-t">
                  <div>
                    <h3 class="font-semibold text-gray-800 flex items-center gap-2"><span>{lib.id}</span>{#if lib.meta?.version}<span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{lib.meta.version}</span>{/if}</h3>
                    <p class="text-xs text-gray-500">{lib.meta?.description || 'Pas de description'}</p>
                  </div>
                  <div class="text-xs text-gray-500">{lib.components.length} composant{lib.components.length>1?'s':''}</div>
                </div>
                {#if !lib.components.length}
                  <div class="p-4 text-xs text-gray-500">Aucun composant</div>
                {:else}
                  <div class="grid md:grid-cols-2 gap-4 p-4">
                    {#each lib.components as c}
                      <div class="border rounded p-3 bg-gray-50 relative">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="text-sm font-semibold text-gray-800">{c.name}</h4>
                          <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">{formatBytes(c.size)} • {c.lines} l.</span>
                        </div>
                        <pre class="text-[10px] leading-4 max-h-40 overflow-auto bg-gray-800 text-gray-100 p-2 rounded">{c.snippet}</pre>
                        <div class="mt-2 flex gap-2">
                          <button class="text-[11px] underline" on:click={() => { navigator.clipboard.writeText(c.snippet); }}>Copier</button>
                          <button class="text-[11px] underline" on:click={() => { previewCode = c.snippet; activeTab='preview'; }}>Prévisualiser</button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </Card>
    {/if}


    {#if activeTab === 'ai'}
      <Card title="Statut des Fournisseurs IA" subtitle="Clés détectées côté serveur / masquées">
        <div class="flex items-center justify-between mb-4">
          <AiStatusBadge providers={aiMap} loading={aiLoading} />
          <button class="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300" on:click={loadAIStatus} disabled={aiLoading}>{aiLoading?'...':'Rafraîchir'}</button>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          {#each aiList as p}
            <div class="p-3 border rounded bg-white flex flex-col gap-1 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-800">{p.id}</span>
                <span class="px-2 py-0.5 rounded-full {p.connected ? 'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">{p.connected ? 'ok':'absent'}</span>
              </div>
              {#if p.maskedKey}<code class="text-[10px] bg-gray-100 px-1 py-0.5 rounded">{p.maskedKey}</code>{/if}
            </div>
          {/each}
          {#if !aiList.length}
            <div class="text-sm text-gray-500">Aucun provider.</div>
          {/if}
        </div>
        <div class="mt-4 text-[10px] text-gray-500">Dernière mise à jour: {new Date().toLocaleTimeString()} • Providers actifs: {Object.values(aiMap).filter(Boolean).length}</div>
      </Card>
    {/if}

    {#if activeTab === 'preview'}
      <Card title="Preview Composant" subtitle="Compilation SSR + hydratation en direct">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-gray-700">Code Svelte</h3>
              <div class="flex items-center gap-3 text-xs">
                <label class="inline-flex items-center gap-1 cursor-pointer"><input type="checkbox" bind:checked={previewStrict}> <span>Strict</span></label>
                <label class="inline-flex items-center gap-1 cursor-pointer" title="Diagnostic brut compiler"><input type="checkbox" bind:checked={previewDiagnostic}> <span>Diag</span></label>
                <button class="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-40" on:click={runPreview} disabled={previewLoading}>{previewLoading ? 'Compilation...' : 'Compiler'}</button>
              </div>
            </div>
            <div class="relative">
              <textarea class="w-full h-72 font-mono text-xs p-2 border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" bind:value={previewCode} on:input={(e)=> lineCount = (e.target.value.match(/\n/g)||[]).length + 1}></textarea>
              <div class="absolute bottom-1 right-2 text-[10px] text-gray-500 bg-white/70 px-1 rounded">{lineCount} l.</div>
            </div>
            {#if previewError}
              <div class="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">{previewError}</div>
            {/if}
            {#if rawError}
              <div class="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-300 p-2 rounded">{rawError}</div>
            {/if}
            {#if rawJsPreview}
              <details class="mt-2 text-[10px]">
                <summary class="cursor-pointer text-gray-600">Voir JS SSR brut (tronc.)</summary>
                      <label class="flex items-center gap-1"><input type="checkbox" bind:checked={fastPreview}> <span>Fast preview</span></label>
                <pre class="mt-1 max-h-40 overflow-auto bg-gray-900 text-[10px] text-gray-100 p-2 rounded">{rawJsPreview}</pre>
                      {#if fastPreview}
                        <button class="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-40" on:click={runFastPreview} disabled={fastStatus==='compiling'}>{fastStatus==='compiling'?'Fast...':'Fast DOM'}</button>
                      {/if}
              </details>
            {/if}
            {#if previewHeuristics.length}
              <div class="mt-3 text-[11px] text-gray-600 flex flex-wrap gap-1">{#each previewHeuristics as h}<span class="px-1.5 py-0.5 bg-gray-200 rounded">{h}</span>{/each}</div>
            {/if}
            {#if importWarnings.length}
              <div class="mt-2 text-[10px] bg-amber-50 border border-amber-200 rounded p-2 text-amber-800">
                <div class="font-semibold mb-1">Import Warnings ({importWarnings.length})</div>
                <ul class="space-y-0.5 max-h-32 overflow-auto">
                  {#each importWarnings as w}<li class="truncate" title={w}>{w}</li>{/each}
                </ul>
              </div>
            {/if}
            {#if rewritesMeta}
              <details class="mt-2 text-[10px]">
                <summary class="cursor-pointer text-gray-600">Réécritures Imports</summary>
                <pre class="mt-1 max-h-40 overflow-auto bg-gray-900 text-gray-100 p-2 rounded">{JSON.stringify(rewritesMeta, null, 2)}</pre>
              </details>
            {/if}
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Résultat</h3>
            {#if previewHtml}
              <iframe key={iframeKey} title="Preview composant" class="w-full h-72 border rounded bg-white" srcdoc={previewHtml} sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"></iframe>
            {:else}
              <div class="w-full h-72 border rounded bg-gray-50 grid place-items-center text-xs text-gray-500">Aucun rendu (compiler pour voir)</div>
            {/if}
            <div class="mt-2 flex gap-2 text-[10px] text-gray-500">
              <button class="underline" on:click={() => { navigator.clipboard.writeText(previewHtml||''); }}>Copier HTML</button>
              <button class="underline" on:click={() => { previewCode = '<script>\n let t = new Date().toLocaleTimeString();<\/script>\n<p>Horloge: {t}</p>'; }}>Exemple simple</button>
              <button class="underline" on:click={() => { previewCode = '<h1>Hello</h1>'; }}>Minimal</button>
              {#if previewSsrJs && previewDomJs}
                <button class="underline" on:click={() => showDiff = !showDiff}>{showDiff? 'Masquer diff':'Diff SSR/Fast'}</button>
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
                {#if !diffBlocks.length}<div class="text-gray-400">Aucune différence détectée.</div>{/if}
                {#if diffBlocksAll.length > diffBlocks.length}
                  <div class="mt-2"><button class="px-2 py-1 rounded bg-indigo-600 text-white" on:click={loadMoreDiff}>Charger plus</button></div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </Card>
    {/if}

    {#if activeTab === 'prompts'}
      <Card title="Templates de Prompts" subtitle="Templates disponibles dans promptLibrary">
        {#if !promptTemplates.length}
          <p class="text-sm text-gray-500">Aucun template.</p>
        {:else}
          <ul class="list-disc ml-5 text-sm space-y-1">
            {#each promptTemplates as p}
              <li><code class="px-1.5 py-0.5 bg-gray-100 rounded text-[11px]">{p}</code></li>
            {/each}
          </ul>
        {/if}
      </Card>
    {/if}

    {#if activeTab === 'diagnostic'}
      <Card title="Diagnostic Compilation" subtitle="État des systèmes de compilation Svelte">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            {#if diagnosticLoading}
              <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span class="text-sm text-gray-600">Diagnostic en cours...</span>
            {:else if diagnosticData}
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full {diagnosticData.status === 'healthy' ? 'bg-green-500' : diagnosticData.status === 'issues_detected' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
                <span class="text-sm font-medium {diagnosticData.status === 'healthy' ? 'text-green-700' : diagnosticData.status === 'issues_detected' ? 'text-yellow-700' : 'text-red-700'}">{diagnosticData.status === 'healthy' ? 'Système opérationnel' : diagnosticData.status === 'issues_detected' ? 'Problèmes détectés' : 'Erreur système'}</span>
              </div>
            {/if}
          </div>
          <button class="text-xs px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-40" on:click={loadDiagnostic} disabled={diagnosticLoading}>
            {diagnosticLoading ? 'Test...' : 'Tester'}
          </button>
        </div>

        {#if diagnosticError}
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Erreur:</strong> {diagnosticError}
          </div>
        {/if}

        {#if diagnosticData}
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Svelte Info -->
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <i class="fas fa-code-branch text-purple-600"></i>
                Svelte Runtime
              </h3>
              <div class="bg-gray-50 p-3 rounded text-sm">
                <div class="grid grid-cols-2 gap-2">
                  <span class="text-gray-600">Version:</span>
                  <code class="bg-white px-2 py-1 rounded text-xs">{diagnosticData.svelte?.version || 'N/A'}</code>
                </div>
              </div>

              <!-- Modules disponibles -->
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">Modules Internes</h4>
                <div class="space-y-1 text-xs">
                  {#each Object.entries(diagnosticData.modules?.available || {}) as [path, info]}
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <code class="text-gray-700 flex-1 mr-2">{path.replace('node_modules/svelte/', '')}</code>
                      <div class="flex items-center gap-1">
                        <div class="w-2 h-2 rounded-full {info.exists ? 'bg-green-500' : 'bg-red-500'}"></div>
                        {#if info.exists && info.size}
                          <span class="text-gray-500">{formatBytes(info.size)}</span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Tests Compilation -->
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <i class="fas fa-cogs text-blue-600"></i>
                Tests Compilation
              </h3>
              
              <div class="space-y-3">
                <div class="p-3 bg-gray-50 rounded">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">DOM Compiler</span>
                    <div class="w-2 h-2 rounded-full {diagnosticData.runtime?.simpleCompile?.success ? 'bg-green-500' : 'bg-red-500'}"></div>
                  </div>
                  {#if diagnosticData.runtime?.simpleCompile?.success}
                    <div class="text-xs text-gray-600">
                      JS: {formatBytes(diagnosticData.runtime.simpleCompile.jsSize)} | 
                      CSS: {formatBytes(diagnosticData.runtime.simpleCompile.cssSize)} |
                      Imports: {diagnosticData.runtime.simpleCompile.hasImports ? 'Oui' : 'Non'}
                    </div>
                  {:else}
                    <div class="text-xs text-red-600">{diagnosticData.runtime?.simpleCompile?.error || 'Échec'}</div>
                  {/if}
                </div>

                <div class="p-3 bg-gray-50 rounded">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">SSR Compiler</span>
                    <div class="w-2 h-2 rounded-full {diagnosticData.runtime?.ssrCompile?.success ? 'bg-green-500' : 'bg-red-500'}"></div>
                  </div>
                  {#if diagnosticData.runtime?.ssrCompile?.success}
                    <div class="text-xs text-gray-600">JS: {formatBytes(diagnosticData.runtime.ssrCompile.jsSize)}</div>
                  {:else}
                    <div class="text-xs text-red-600">{diagnosticData.runtime?.ssrCompile?.error || 'Échec'}</div>
                  {/if}
                </div>
              </div>

              <!-- Imports détectés -->
              {#if diagnosticData.runtime?.detectedImports?.length}
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Imports Générés</h4>
                  <div class="max-h-32 overflow-auto">
                    {#each diagnosticData.runtime.detectedImports as imp}
                      <code class="block text-xs bg-gray-900 text-gray-100 p-1 rounded mb-1">{imp}</code>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- État Global -->
          <div class="mt-6 pt-4 border-t border-gray-200">
            <h3 class="font-semibold text-gray-800 mb-3">État Runtime</h3>
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div class="bg-blue-50 p-3 rounded text-center">
                <div class="text-lg font-bold text-blue-600">{diagnosticData.runtime?.globalState?.compileRequests || 0}</div>
                <div class="text-xs text-blue-700">Requêtes Compile</div>
              </div>
              <div class="bg-green-50 p-3 rounded text-center">
                <div class="text-lg font-bold text-green-600">{diagnosticData.runtime?.globalState?.runtimeBundles || 0}</div>
                <div class="text-xs text-green-700">Bundles Cache</div>
              </div>
              <div class="bg-purple-50 p-3 rounded text-center">
                <div class="text-lg font-bold text-purple-600">{diagnosticData.runtime?.globalState?.tailwindCache || 0}</div>
                <div class="text-xs text-purple-700">CSS Cache</div>
              </div>
            </div>
          </div>

          <!-- Problèmes détectés -->
          {#if diagnosticData.issues?.length}
            <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 class="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <i class="fas fa-exclamation-triangle"></i>
                Problèmes Détectés ({diagnosticData.issues.length})
              </h4>
              <ul class="text-sm text-yellow-700 space-y-1">
                {#each diagnosticData.issues as issue}
                  <li class="flex items-start gap-2">
                    <i class="fas fa-circle text-xs mt-1.5 text-yellow-500"></i>
                    {issue}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <div class="mt-4 text-xs text-gray-500 flex justify-between">
            <span>Diagnostic: {diagnosticData.timestamp}</span>
            <span>Runtime Node.js: {diagnosticData.runtime?.nodeVersion || 'N/A'}</span>
          </div>
        {:else if !diagnosticLoading}
          <div class="text-center py-8">
            <i class="fas fa-stethoscope text-gray-400 text-4xl mb-4"></i>
            <p class="text-gray-500 mb-4">Cliquez sur "Tester" pour diagnostiquer les systèmes de compilation</p>
            <button class="px-4 py-2 bg-blue-600 text-white rounded" on:click={loadDiagnostic}>
              Lancer Diagnostic
            </button>
          </div>
        {/if}
      </Card>
    {/if}
    
    <!-- Gestion des Projets -->
    {#if activeTab === 'projects'}
      <Card title="Tous les Projets" subtitle="Gestion et supervision des projets utilisateurs">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each projects as project}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 flex items-center gap-2">{project.name}{#if project.id}<button class="text-[10px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300" title={project.id} on:click={() => { navigator.clipboard.writeText(project.id); pushToast('ID copié'); }}>{shortId(project.id)}</button>{/if}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-600 max-w-xs truncate">{project.description || 'Pas de description'}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusBadge(project.status)}">
                      {project.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(project.created_at)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="flex space-x-2">
                      <Button variant="secondary" size="sm">
                        <i class="fas fa-eye"></i>
                      </Button>
                      <Button variant="danger" size="sm">
                        <i class="fas fa-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          
          {#if projects.length === 0}
            <div class="text-center py-12">
              <i class="fas fa-folder-open text-gray-400 text-6xl mb-4"></i>
              <p class="text-gray-500">Aucun projet trouvé</p>
            </div>
          {/if}
        </div>
      </Card>
    {/if}
    
    <!-- Gestion des Templates -->
    {#if activeTab === 'templates'}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Templates</h2>
          <p class="text-gray-600">Gérez les templates de projets disponibles</p>
        </div>
        <Button on:click={() => showNewTemplateModal = true}>
          <i class="fas fa-plus mr-2"></i>
          Nouveau Template
        </Button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each templates as template}
          <Card>
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{template.name}</h3>
              <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {template.type}
              </span>
            </div>
            
            <p class="text-gray-600 text-sm mb-4">{template.description}</p>
            
            <div class="mb-4">
              <p class="text-xs text-gray-500 mb-2">Structure:</p>
              <div class="bg-gray-50 p-2 rounded text-xs">
                {#if template.structure?.routes}
                  <p><strong>Routes:</strong> {template.structure.routes.length}</p>
                {/if}
                {#if template.structure?.components}
                  <p><strong>Composants:</strong> {template.structure.components.length}</p>
                {/if}
                {#if template.structure?.features}
                  <p><strong>Fonctionnalités:</strong> {template.structure.features.length}</p>
                {/if}
              </div>
            </div>
            
            <div class="flex space-x-2">
              <Button variant="secondary" size="sm" class="flex-1">
                <i class="fas fa-edit mr-1"></i>
                Modifier
              </Button>
              <Button variant="danger" size="sm">
                <i class="fas fa-trash"></i>
              </Button>
            </div>
          </Card>
        {/each}
      </div>
      
      {#if templates.length === 0}
        <Card title="Aucun template" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <i class="fas fa-layer-group text-6xl"></i>
          </div>
          <p class="text-gray-600 mb-4">Aucun template disponible.</p>
          <Button on:click={() => showNewTemplateModal = true}>
            Créer le premier template
          </Button>
        </Card>
      {/if}
    {/if}
    
    <!-- Gestion des Composants -->
    {#if activeTab === 'components'}
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Composants</h2>
          <p class="text-gray-600">Bibliothèque de composants réutilisables</p>
        </div>
        <Button on:click={() => showNewComponentModal = true}>
          <i class="fas fa-plus mr-2"></i>
          Nouveau Composant
        </Button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each components as component}
          <Card>
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">{component.name}</h3>
              <div class="flex space-x-1">
                <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {component.category}
                </span>
                <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {component.type}
                </span>
              </div>
            </div>
            
            <div class="mb-4">
              <p class="text-xs text-gray-500 mb-2">Code (aperçu):</p>
              <pre class="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-x-auto max-h-24 overflow-y-auto">
{component.code.substring(0, 200)}...
              </pre>
            </div>
            
            <div class="flex space-x-2">
              <Button variant="secondary" size="sm" class="flex-1">
                <i class="fas fa-code mr-1"></i>
                Voir Code
              </Button>
              <Button variant="secondary" size="sm">
                <i class="fas fa-edit"></i>
              </Button>
              <Button variant="danger" size="sm">
                <i class="fas fa-trash"></i>
              </Button>
            </div>
          </Card>
        {/each}
      </div>
      
      {#if components.length === 0}
        <Card title="Aucun composant" class="text-center py-12">
          <div class="text-gray-400 mb-4">
            <i class="fas fa-puzzle-piece text-6xl"></i>
          </div>
          <p class="text-gray-600 mb-4">Aucun composant disponible.</p>
          <Button on:click={() => showNewComponentModal = true}>
            Créer le premier composant
          </Button>
        </Card>
      {/if}
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
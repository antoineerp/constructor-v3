<script>
  // Ajout état pour générateur application
  let appPrompt = '';
  let appIsGenerating = false;
  let appFiles = null;
  let appSelectedFile = null;
  let appError = '';
  async function generateApplication(){
    appError=''; appIsGenerating = true;
    try {
      const res = await fetch('/api/generate/app', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ prompt: appPrompt }) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error || 'Erreur inconnue');
      appFiles = data.files;
      appSelectedFile = Object.keys(appFiles)[0] || null;
    } catch(e){ appError = e.message; console.error(e);} finally { appIsGenerating = false; }
  }
  import { onMount } from 'svelte';
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import Input from '$lib/Input.svelte';
  import Modal from '$lib/Modal.svelte';
  import DynamicComponent from '$lib/DynamicComponent.svelte';
  import { supabase } from '$lib/supabase.js';
  import JSZip from 'jszip';
  
  let projects = [];
  let showNewProjectModal = false;
  let newProject = {
    name: '',
    description: '',
    prompt: ''
  };
  let loading = false;
  // Gestion session utilisateur (pour RLS Supabase)
  let sessionUserId = null;
  
  // === ÉTAT CHAT & PRÉVISUALISATION IA ===
  let chatPrompt = '';
  let chatMessages = [];
  let chatLoading = false; // envoi message
  let chatIsGenerating = false; // animation génération
  let lastGenerated = null; // { type, description, code }
  const previewTabs = [
    { id: 'preview', label: 'Preview', icon: 'fas fa-eye' },
    { id: 'code', label: 'Code', icon: 'fas fa-code' },
    { id: 'files', label: 'Fichiers', icon: 'fas fa-folder' }
  ];
  let activePreviewTab = 'preview';
  
  // === NOUVEAUX ÉTATS ===
  let selectedProjectId = null; // rattacher génération
  let generatedHistory = []; // liste des composants générés (session)
  let liveEditEnabled = false;
  let liveEditCode = ''; // zone d'édition
  let parseError = '';
  // === BLUEPRINT ===
  let blueprintQuery = '';
  let blueprintLoading = false;
  let blueprint = null;
  let blueprintError = '';
  let activeMainTab = 'generate';
  async function generateBlueprint(){
    blueprintError=''; blueprint=null; blueprintLoading=true;
    try {
      const res = await fetch('/api/prompt/expand', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ query: blueprintQuery }) });
      const data = await res.json();
      if(!data.success) throw new Error(data.error||'Erreur blueprint');
      blueprint = data.blueprint;
    } catch(e){ blueprintError = e.message; } finally { blueprintLoading=false; }
  }
  function blueprintToProject(){ if(!blueprint) return; appPrompt = blueprint?.recommended_prompts?.app_level || appPrompt; activeMainTab='generate'; }
  
  onMount(async () => {
    // Récupération session pour associer user_id aux projets et satisfaire RLS
    try {
      const { data: { session } } = await supabase.auth.getSession();
      sessionUserId = session?.user?.id || null;
      // Écoute changements d'auth si l'app ajoute plus tard un flux de login
      supabase.auth.onAuthStateChange((_event, sess) => {
        sessionUserId = sess?.user?.id || null;
      });
    } catch(e){ console.warn('Impossible de récupérer la session Supabase:', e); }
    await loadProjects();
  });
  
  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      projects = data || [];
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    }
  }
  
  async function createProject() {
    if (!newProject.name || !newProject.prompt) return;
    try {
      loading = true;
      if(!sessionUserId){
        // Si pas d'utilisateur, informer que la politique RLS va échouer
        console.warn('Aucun user authentifié. La politique RLS peut bloquer l\'insert.');
      }
      const generatedCode = {
        'README.md': '# ' + newProject.name + '\n\n' + newProject.description + '\n\nGénéré avec Constructor V3',
        'src/app.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;'
      };
      const payload = {
        name: newProject.name,
        description: newProject.description,
        prompt_original: newProject.prompt,
        template_id: 1,
        code_generated: generatedCode,
        status: 'draft',
        user_id: sessionUserId // clé cruciale pour RLS (policy user_id = auth.uid())
      };
      const { error } = await supabase.from('projects').insert([payload]);
      if (error) throw error;
      newProject = { name: '', description: '', prompt: '' };
      showNewProjectModal = false;
      await loadProjects();
    } catch(error){
      console.error('Erreur création projet:', error);
      alert('Création impossible: '+ error.message + '\nVérifie la policy RLS sur projects (insert) et la colonne user_id.');
    } finally { loading = false; }
  }
  
  // ================= FONCTIONS CHAT =================
  function detectComponentType(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('bouton') || lower.includes('button')) return 'button';
    if (lower.includes('carte') || lower.includes('card')) return 'card';
    if (lower.includes('input') || lower.includes('champ') || lower.includes('formulaire')) return 'input';
    if (lower.includes('modal') || lower.includes('popup') || lower.includes('dialog')) return 'modal';
    if (lower.includes('nav') || lower.includes('menu')) return 'navigation';
    return 'generic';
  }
  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }
  // Détection JSON multi-fichiers: si le code retourné commence par { et contient ":" on tente JSON.parse
  function tryParseMultiFiles(rawCode) {
    parseError = '';
    if (!rawCode) return { mode: 'single', files: { 'Component.svelte': rawCode } };
    const trimmed = rawCode.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return { mode: 'single', files: { 'Component.svelte': rawCode } };
    }
    try {
      const obj = JSON.parse(trimmed);
      // attendu: { "filename.ext": "content", ... }
      if (Object.values(obj).every(v => typeof v === 'string')) {
        return { mode: 'multi', files: obj };
      }
      return { mode: 'single', files: { 'Component.svelte': rawCode } };
    } catch (e) {
      parseError = 'JSON invalide: ' + e.message;
      return { mode: 'single', files: { 'Component.svelte': rawCode } };
    }
  }
  // Fonction de génération (définie explicitement pour éviter ReferenceError en prod)
  async function sendChatMessage() {
    if (!chatPrompt.trim() || chatLoading) return;
    chatLoading = true;
    chatIsGenerating = true;
    parseError = '';
    const userMessage = { id: Date.now().toString(), type: 'user', content: chatPrompt.trim(), timestamp: new Date() };
    chatMessages = [...chatMessages, userMessage];
    const currentPrompt = chatPrompt;
    chatPrompt = '';
    try {
      const componentType = detectComponentType(currentPrompt);
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, type: componentType, project_id: selectedProjectId })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Échec génération');
      const multi = tryParseMultiFiles(json.code);
      const firstFile = Object.keys(multi.files)[0];
      lastGenerated = { type: componentType, description: currentPrompt, code: multi.files[firstFile], files: multi.files, mode: multi.mode };
      liveEditCode = lastGenerated.code;
      generatedHistory = [
        { id: lastGenerated.id || Date.now().toString(), date: new Date(), ...lastGenerated },
        ...generatedHistory
      ];
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Composant ${componentType} généré (${multi.mode === 'multi' ? 'multi-fichiers' : 'mono-fichier'}).`,
        component: lastGenerated,
        timestamp: new Date()
      };
      chatMessages = [...chatMessages, aiMessage];
      saveGeneratedComponent(componentType, currentPrompt, json.code, selectedProjectId).catch(() => {});
    } catch (e) {
      console.error('Échec génération OpenAI, fallback utilisé:', e);
      const safeText = currentPrompt.replace(/`/g, '');
      const fallbackCode = `<div class=\"p-4 border rounded bg-yellow-50 text-sm text-yellow-700\">Fallback (OpenAI indisponible) : ${safeText} </div>`;
      lastGenerated = { type: 'fallback', description: currentPrompt, code: fallbackCode, files: { 'Component.svelte': fallbackCode }, mode: 'single' };
      liveEditCode = lastGenerated.code;
      generatedHistory = [{ id: Date.now().toString(), date: new Date(), ...lastGenerated }, ...generatedHistory];
      chatMessages = [
        ...chatMessages,
        {
          id: (Date.now() + 2).toString(),
            type: 'ai',
            content: 'Erreur IA: ' + e.message + ' (fallback généré).',
            component: lastGenerated,
            timestamp: new Date()
        }
      ];
    } finally {
      chatLoading = false;
      chatIsGenerating = false;
    }
  }
  async function saveGeneratedComponent(type, description, rawCode, projectId) {
    const { error } = await supabase.from('components').insert({
      name: `UserGen ${type} - ${Date.now()}`,
      type,
      description,
      code: rawCode,
      project_id: projectId,
      category: 'ai-generated',
      created_at: new Date().toISOString()
    });
    if (error) console.warn('Save error', error);
  }
  function selectHistoryItem(item) {
    lastGenerated = item;
    liveEditCode = item.code;
    activePreviewTab = 'preview';
  }
  function applyLiveEdit() {
    if (!lastGenerated) return;
    lastGenerated = { ...lastGenerated, code: liveEditCode };
  }
  async function exportZip() {
    if (!lastGenerated) return;
    const zip = new JSZip();
    const folder = zip.folder('generated');
    const files = lastGenerated.files || { 'Component.svelte': lastGenerated.code };
    Object.entries(files).forEach(([name, content]) => folder.file(name, content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'component_generated.zip'; a.click();
    URL.revokeObjectURL(url);
  }
  
  // ================== UTILITAIRES EXISTANTS ==================
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  function getStatusBadge(status) {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  }
  
  function getStatusText(status) {
    const texts = {
      draft: 'Brouillon',
      completed: 'Terminé',
      published: 'Publié'
    };
    return texts[status] || status;
  }
</script>

<svelte:head>
  <title>Espace Utilisateur - Constructor V3</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-6xl mx-auto px-4">
    <!-- En-tête -->
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2"><i class="fas fa-user-gear text-blue-600"></i> Tableau de bord</h1>
      <div class="flex items-center gap-3">
        <Button on:click={() => showNewProjectModal = true} variant="primary"><i class="fas fa-plus mr-2"></i>Nouveau projet</Button>
        {#if sessionUserId}
          <button class="px-3 py-2 text-sm rounded-lg bg-white border hover:bg-gray-50 flex items-center gap-2" on:click={async()=>{ await supabase.auth.signOut(); sessionUserId=null; window.location.href='/auth'; }}>
            <i class="fas fa-right-from-bracket text-gray-500"></i> Logout
          </button>
        {:else}
          <a href="/auth" class="px-3 py-2 text-sm rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 flex items-center gap-2"><i class="fas fa-sign-in"></i> Login</a>
        {/if}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <Card>
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg mr-4"><i class="fas fa-layer-group text-blue-600 text-xl"></i></div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{projects.length}</p>
            <p class="text-sm text-gray-600">Projets Total</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg mr-4">
            <i class="fas fa-check-circle text-green-600 text-xl"></i>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'completed').length}</p>
            <p class="text-sm text-gray-600">Terminés</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg mr-4">
            <i class="fas fa-clock text-yellow-600 text-xl"></i>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'draft').length}</p>
            <p class="text-sm text-gray-600">En Cours</p>
          </div>
        </div>
      </Card>
      
      <Card>
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg mr-4">
            <i class="fas fa-globe text-purple-600 text-xl"></i>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'published').length}</p>
            <p class="text-sm text-gray-600">Publiés</p>
          </div>
        </div>
      </Card>
    </div>
    
    <!-- Liste des projets -->
    {#if projects.length === 0}
      <Card title="Aucun projet" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <i class="fas fa-folder-open text-6xl"></i>
        </div>
        <p class="text-gray-600 mb-4">Vous n'avez pas encore créé de projet.</p>
        <Button on:click={() => showNewProjectModal = true}>
          Créer mon premier projet
        </Button>
      </Card>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each projects as project}
          <Card class="hover:shadow-xl transition-shadow">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
              <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusBadge(project.status)}">
                {getStatusText(project.status)}
              </span>
            </div>
            
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
            
            <div class="mb-4">
              <p class="text-xs text-gray-500 mb-2">Prompt original:</p>
              <p class="text-sm text-gray-700 bg-gray-50 p-2 rounded text-truncate">{project.prompt_original}</p>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Créé le {formatDate(project.created_at)}</span>
              <span>{Object.keys(project.code_generated || {}).length} fichiers</span>
            </div>
            
            <div class="flex space-x-2">
              <Button variant="secondary" size="sm" class="flex-1">
                <i class="fas fa-edit mr-1"></i>
                Modifier
              </Button>
              <Button size="sm" class="flex-1">
                <i class="fas fa-eye mr-1"></i>
                Preview
              </Button>
              <Button variant="secondary" size="sm">
                <i class="fas fa-download"></i>
              </Button>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
    <!-- Onglets principaux -->
    <div class="mt-10 mb-8 border-b flex items-center gap-6">
      <button class="py-2 px-1 text-sm font-medium -mb-px border-b-2 transition-colors {activeMainTab==='generate' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={()=> activeMainTab='generate'}><i class="fas fa-wand-magic-sparkles mr-1"></i> Génération composants</button>
      <button class="py-2 px-1 text-sm font-medium -mb-px border-b-2 transition-colors {activeMainTab==='blueprint' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" on:click={()=> activeMainTab='blueprint'}><i class="fas fa-diagram-project mr-1"></i> Blueprint Site</button>
    </div>
  </div>
</div>

<!-- Modal Nouveau Projet -->
<Modal bind:open={showNewProjectModal} title="Nouveau Projet" size="lg">
  <form id="project-form" on:submit|preventDefault={createProject}>
    <div class="space-y-4">
      <Input
        label="Nom du projet"
        placeholder="Mon super site web"
        bind:value={newProject.name}
        required
      />
      
      <div>
        <label for="proj_desc" class="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
        <textarea id="proj_desc"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Description de votre projet..."
          bind:value={newProject.description}
          rows="3"
        ></textarea>
      </div>
      
      <div>
        <label for="proj_prompt" class="block text-sm font-medium text-gray-700 mb-1">Prompt IA</label>
        <textarea id="proj_prompt"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Décrivez ce que vous voulez créer... Ex: Un site e-commerce pour vendre des vêtements avec panier et paiement"
          bind:value={newProject.prompt}
          rows="4"
          required
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">Décrivez en détail ce que vous voulez créer. L'IA générera le code correspondant.</p>
      </div>
    </div>
  </form>
    
  <div slot="footer" class="flex justify-end space-x-3 p-6 border-t border-gray-200">
    <Button variant="secondary" on:click={() => showNewProjectModal = false}>
      Annuler
    </Button>
    <Button form="project-form" type="submit" {loading}>
      {#if loading}
        <i class="fas fa-spinner fa-spin mr-2"></i>
      {:else}
        <i class="fas fa-magic mr-2"></i>
      {/if}
      Générer le Projet
    </Button>
  </div>
</Modal>

{#if activeMainTab === 'generate'}
<!-- ====== SECTION GENERATION IA (Chat + Preview) ====== -->
<div class="max-w-6xl mx-auto px-4 mb-12">
  <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
    <i class="fas fa-wand-magic-sparkles text-blue-600"></i>
    Génération de composants IA
  </h2>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Colonne Chat -->
    <div class="bg-white border rounded-xl shadow-sm flex flex-col h-[620px]">
      <div class="px-5 pt-4 pb-3 border-b flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">Chat</h3>
        {#if chatIsGenerating}
          <span class="text-xs text-blue-600 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> Génération...</span>
        {/if}
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#if chatMessages.length === 0}
          <div class="text-center text-gray-500 text-sm mt-20">
            Décrivez un composant : "Bouton primaire avec icône et effet hover"
          </div>
        {/if}
        {#each chatMessages as m}
          <div class="flex {m.type === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow {m.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}">
              {m.content}
              {#if m.component}
                <div class="mt-2 border rounded bg-white p-2">
                  <DynamicComponent code={m.component.code} />
                </div>
              {/if}
            </div>
          </div>
        {/each}
        {#if chatIsGenerating}
          <div class="flex justify-start">
            <div class="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
              <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Génération en cours...
            </div>
          </div>
        {/if}
      </div>
      <div class="border-t p-4">
        <div class="flex gap-3">
          <textarea
            class="flex-1 resize-none h-14 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Décris le composant à générer..."
            bind:value={chatPrompt}
            on:keydown={handleChatKeyDown}
            disabled={chatLoading}
          ></textarea>
          <button
            class="px-5 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            on:click={sendChatMessage}
            disabled={!chatPrompt.trim() || chatLoading}
          >
            {#if chatLoading}
              <i class="fas fa-spinner fa-spin"></i>
            {:else}
              <i class="fas fa-paper-plane"></i>
            {/if}
            Envoyer
          </button>
        </div>
        <p class="mt-2 text-[11px] text-gray-500 flex items-center gap-1"><i class="fas fa-lightbulb"></i> Appuie sur Entrée pour envoyer</p>
      </div>
    </div>
    <!-- Colonne Preview -->
    <div class="bg-white border rounded-xl shadow-sm flex flex-col h-[620px]">
      <div class="px-5 pt-4 pb-0 border-b">
        <div class="flex items-center gap-6">
          {#each previewTabs as t}
            <button
              class="py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 {activePreviewTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
              on:click={() => activePreviewTab = t.id}
            >
              <i class={t.icon}></i>{t.label}
            </button>
          {/each}
        </div>
      </div>
      <div class="flex-1 overflow-hidden">
        {#if !lastGenerated}
          <div class="h-full flex items-center justify-center text-gray-400 text-sm p-10 text-center">
            Aucune génération encore. Utilisez le chat à gauche.
          </div>
        {:else}
          {#if activePreviewTab === 'preview'}
            <div class="p-6 overflow-auto h-full bg-gray-50">
              <div class="border rounded-lg bg-white p-6 shadow-inner">
                <DynamicComponent code={lastGenerated.code} />
              </div>
            </div>
          {:else if activePreviewTab === 'code'}
            <div class="p-4 h-full overflow-auto bg-gray-900 text-green-300 text-xs font-mono">
              <pre><code>{lastGenerated.code}</code></pre>
            </div>
          {:else if activePreviewTab === 'files'}
            <div class="p-6 h-full overflow-auto text-sm">
              <h4 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-folder"></i> Fichiers générés</h4>
              <ul class="space-y-2">
                <li class="p-3 border rounded flex items-center justify-between bg-gray-50">
                  <span class="flex items-center gap-2 text-gray-700"><i class="fas fa-file-code text-blue-500"></i> Component.svelte</span>
                  <span class="text-xs text-gray-500">{lastGenerated.code.length} chars</span>
                </li>
              </ul>
              <p class="mt-4 text-xs text-gray-500">(Prochainement : arborescence multi-fichiers)</p>
            </div>
          {/if}
        {/if}
      </div>
      {#if lastGenerated}
        <div class="border-t p-3 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
          <span>{lastGenerated.type} généré depuis: "{lastGenerated.description}"</span>
          <button class="text-blue-600 hover:underline" on:click={() => { navigator.clipboard.writeText(lastGenerated.code); }}>Copier le code</button>
        </div>
      {/if}
    </div>
  </div>
 </div>
<!-- ====== FIN SECTION GENERATION IA ====== -->
{/if}

{#if activeMainTab === 'blueprint'}
<div class="max-w-6xl mx-auto px-4 mb-20">
  <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><i class="fas fa-diagram-project text-purple-600"></i> Blueprint de site</h2>
  <div class="bg-white border rounded-xl p-6 shadow-sm mb-6">
    <label for="bp_query" class="block text-sm font-medium text-gray-700 mb-1">Idée de site / besoin</label>
    <textarea id="bp_query" rows="3" class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: blog sur les motos anciennes avec fiches techniques et comparatifs" bind:value={blueprintQuery}></textarea>
    <div class="flex gap-3 mt-4">
      <button class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 flex items-center gap-2" on:click={generateBlueprint} disabled={!blueprintQuery.trim() || blueprintLoading}>
        {#if blueprintLoading}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-gears"></i>{/if}
        Générer Blueprint
      </button>
      {#if blueprint}
        <button class="px-4 py-2 text-sm rounded-lg bg-white border hover:bg-gray-50 flex items-center gap-2" on:click={blueprintToProject}><i class="fas fa-arrow-right"></i> Utiliser pour app</button>
      {/if}
    </div>
    {#if blueprintError}<div class="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{blueprintError}</div>{/if}
  </div>
  {#if blueprint}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-route text-blue-600"></i> Routes</h3>
          <ul class="space-y-2 text-sm">
            {#each blueprint.routes as r}
              <li class="p-2 rounded border flex flex-col gap-1 bg-gray-50">
                <div class="flex items-center justify-between"><span class="font-mono text-xs px-2 py-0.5 rounded bg-white border">{r.path}</span><span class="text-xs text-gray-500">{r.purpose}</span></div>
                <div class="text-[11px] text-gray-500">Sections: {r.sections.join(', ')}</div>
              </li>
            {/each}
          </ul>
        </div>
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-database text-green-600"></i> Modèles de données</h3>
          {#if blueprint.data_models?.length === 0}
            <p class="text-xs text-gray-500">Aucun modèle.</p>
          {:else}
            <div class="space-y-4">
              {#each blueprint.data_models as m}
                <div class="border rounded-lg p-3 bg-gray-50">
                  <p class="text-sm font-semibold mb-2">{m.name}</p>
                  <ul class="text-[11px] grid grid-cols-2 gap-1">
                    {#each m.fields as f}
                      <li class="px-2 py-1 bg-white border rounded flex items-center justify-between">
                        <span>{f.name}</span><span class="text-gray-500">{f.type}{f.required?' *':''}</span>
                      </li>
                    {/each}
                  </ul>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-file-code text-indigo-600"></i> Prompts fichiers</h3>
          <ul class="space-y-2 text-xs">
            {#each blueprint.recommended_prompts?.per_file || [] as pf}
              <li class="border rounded p-2 bg-gray-50">
                <div class="font-mono text-[10px] mb-1 bg-white border px-2 py-0.5 rounded inline-block">{pf.filename}</div>
                <pre class="whitespace-pre-wrap leading-snug">{pf.prompt}</pre>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <div class="space-y-6">
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-brush text-pink-600"></i> Style & SEO</h3>
          <p class="text-xs mb-2"><strong>Palette:</strong> {blueprint.color_palette?.join(', ')}</p>
          <div class="flex gap-2 mb-3 flex-wrap">
            {#each blueprint.color_palette || [] as c}
              <span class="w-7 h-7 rounded border shadow-inner" style="background:{c}" title={c}></span>
            {/each}
          </div>
          <p class="text-xs"><strong>Titre:</strong> {blueprint.seo_meta?.title}</p>
          <p class="text-xs mb-2"><strong>Description:</strong> {blueprint.seo_meta?.description}</p>
          <p class="text-xs"><strong>Mots-clés:</strong> {blueprint.seo_meta?.primary_keywords?.join(', ')}</p>
        </div>
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-newspaper text-orange-600"></i> Articles exemple</h3>
          <ul class="space-y-3 text-xs max-h-72 overflow-auto pr-1">
            {#each blueprint.sample_content?.articles || [] as a}
              <li class="border rounded p-2 bg-gray-50">
                <p class="font-semibold mb-1">{a.title}</p>
                <p class="text-[11px] text-gray-600 mb-1">{a.excerpt}</p>
                <p class="text-[10px] text-gray-400">slug: {a.slug}</p>
              </li>
            {/each}
          </ul>
        </div>
        <div class="bg-white border rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-cubes text-teal-600"></i> Composants clés</h3>
          <div class="flex flex-wrap gap-2">
            {#each blueprint.core_components || [] as cc}
              <span class="px-2 py-1 rounded bg-gray-100 text-[11px] border">{cc}</span>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
{/if}

<!-- ====== GENERATEUR D'APPLICATION IA ====== -->
<div class="max-w-6xl mx-auto px-4 mb-20">
  <div class="flex items-center gap-2 mb-4">
    <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2"><i class="fas fa-diagram-project text-purple-600"></i> Générateur d'application</h2>
    {#if appIsGenerating}
      <span class="text-xs text-purple-600 flex items-center gap-1"><i class="fas fa-spinner fa-spin"></i> Génération...</span>
    {/if}
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="bg-white border rounded-xl shadow-sm p-5 flex flex-col gap-4">
      <div>
        <label for="app_prompt" class="block text-sm font-medium text-gray-700 mb-1">Prompt Application</label>
        <textarea id="app_prompt" bind:value={appPrompt} rows="6" placeholder="Ex: Génère une mini app SvelteKit avec page d'accueil, page produits, page contact utilisant Tailwind et mes composants library." class="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
        <p class="text-[11px] text-gray-500 mt-1">Décris l'architecture souhaitée, routes, sections clés, style.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50 flex items-center gap-2" on:click={generateApplication} disabled={!appPrompt.trim() || appIsGenerating}>
          {#if appIsGenerating}<i class="fas fa-spinner fa-spin"></i>{:else}<i class="fas fa-gears"></i>{/if}
          Générer l'application
        </button>
        {#if appFiles}
          <button class="px-4 py-2 rounded-lg text-sm bg-white border hover:bg-gray-50 flex items-center gap-2" on:click={()=> { appFiles=null; appSelectedFile=null; }}><i class="fas fa-rotate-left"></i> Réinitialiser</button>
        {/if}
      </div>
      {#if appError}
        <div class="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">{appError}</div>
      {/if}
      <div class="text-[11px] text-gray-500 leading-relaxed">
        <p class="mb-1 font-medium text-gray-700">Conseils prompt :</p>
        <ul class="list-disc pl-4 space-y-0.5">
          <li>Spécifie les pages ("/", "/products", "/contact")</li>
          <li>Donne le style général (saas moderne, gradient bleu)</li>
          <li>Indique si tu veux réutiliser la library (Header, Hero...)</li>
          <li>Limite le nombre de fichiers (&lt;8) si possible</li>
        </ul>
      </div>
    </div>
    <div class="bg-white border rounded-xl shadow-sm p-0 flex flex-col overflow-hidden lg:col-span-2 min-h-[480px]">
      {#if !appFiles}
        <div class="flex-1 flex items-center justify-center text-gray-400 text-sm p-10 text-center">
          Aucune application générée pour l'instant.
        </div>
      {:else}
        <div class="flex h-full">
          <div class="w-48 border-r bg-gray-50 p-3 overflow-auto text-xs space-y-1">
            {#each Object.keys(appFiles) as f}
              <button class="block w-full text-left px-2 py-1.5 rounded border text-[11px] break-all {appSelectedFile === f ? 'bg-white border-purple-400 text-purple-700 font-medium' : 'bg-white/70 hover:bg-white border-gray-200 text-gray-600'}" on:click={() => appSelectedFile = f}>{f}</button>
            {/each}
          </div>
          <div class="flex-1 flex flex-col">
            <div class="px-4 py-2 border-b flex items-center justify-between text-xs bg-gray-50">
              <div class="flex items-center gap-2">
                <i class="fas fa-file-code text-purple-600"></i>
                <span class="font-medium">{appSelectedFile || 'Sélectionne un fichier'}</span>
              </div>
              {#if appSelectedFile}
                <button class="text-purple-600 hover:underline" on:click={() => navigator.clipboard.writeText(appFiles[appSelectedFile])}>Copier</button>
              {/if}
            </div>
            <div class="flex-1 overflow-auto bg-gray-900 text-green-300 text-[11px] p-4 font-mono leading-relaxed">
              {#if appSelectedFile}
                <pre><code>{appFiles[appSelectedFile]}</code></pre>
              {:else}
                <div class="h-full flex items-center justify-center text-gray-500">Choisis un fichier dans la liste.</div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
<!-- ====== FIN GENERATEUR D'APPLICATION IA ====== -->

<!-- BARRE OUTILS / OPTIONS AU DESSUS DE LA SECTION IA -->
<div class="max-w-6xl mx-auto px-4 mt-10 mb-4">
  <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
    <div class="flex flex-wrap items-center gap-4">
      <div>
  <label for="select_project_assoc" class="block text-xs font-medium text-gray-600 mb-1">Associer au projet</label>
  <select id="select_project_assoc" bind:value={selectedProjectId} class="px-3 py-2 border rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 min-w-[220px]">
          <option value={null}>Aucun (générique)</option>
          {#each projects as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-center gap-2 mt-4 lg:mt-0">
        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" bind:checked={liveEditEnabled} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Live Edit
        </label>
        {#if lastGenerated}
          <button on:click={exportZip} class="px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <i class="fas fa-file-archive text-orange-500"></i> Export ZIP
          </button>
        {/if}
      </div>
    </div>
    {#if parseError}
      <div class="text-xs text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200 max-w-md">{parseError}</div>
    {/if}
  </div>
</div>
<!-- HISTORIQUE DES GÉNÉRATIONS -->
{#if activeMainTab === 'generate' && generatedHistory.length > 0}
  <div class="max-w-6xl mx-auto px-4 mb-8">
    <details class="bg-white border rounded-lg shadow-sm">
      <summary class="cursor-pointer px-4 py-3 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700 flex items-center gap-2"><i class="fas fa-history text-blue-600"></i> Historique des composants ({generatedHistory.length})</span>
        <span class="text-xs text-gray-500">Cliquer pour {generatedHistory.length > 1 ? 'afficher' : 'voir'}</span>
      </summary>
      <div class="border-t divide-y max-h-72 overflow-auto">
        {#each generatedHistory as item}
          <div class="p-3 flex items-center justify-between text-sm hover:bg-gray-50">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-800 truncate">{item.type} - {item.description}</p>
              <p class="text-xs text-gray-500">{item.mode === 'multi' ? Object.keys(item.files).length + ' fichiers' : '1 fichier'} • {item.date.toLocaleTimeString()}</p>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <button on:click={() => selectHistoryItem(item)} class="px-2 py-1 text-xs border rounded hover:bg-gray-100">Ouvrir</button>
            </div>
          </div>
        {/each}
      </div>
    </details>
  </div>
{/if}
<!-- LIVE EDIT PANEL (s'affiche si activé et lastGenerated) -->
{#if activeMainTab === 'generate' && liveEditEnabled && lastGenerated}
  <div class="max-w-6xl mx-auto px-4 mb-8">
    <div class="bg-white border rounded-xl shadow-sm">
      <div class="px-4 py-2 border-b flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700 flex items-center gap-2"><i class="fas fa-pen text-blue-600"></i> Live Edit</h3>
        <div class="flex items-center gap-2">
          <button on:click={applyLiveEdit} class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1"><i class="fas fa-rotate"></i> Appliquer</button>
          <button on:click={() => { liveEditCode = lastGenerated.code; }} class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">Reset</button>
        </div>
      </div>
      <textarea bind:value={liveEditCode} class="w-full h-48 p-3 font-mono text-xs border-0 focus:ring-0 live-edit-area"></textarea>
      <div class="px-4 py-2 text-xs text-gray-500 border-t">Modification non persistée tant que vous n'exportez pas / sauvegardez.</div>
    </div>
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .chat-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .chat-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  /* Ajout styles édition */
  .live-edit-area { font-family: monospace; }
</style>
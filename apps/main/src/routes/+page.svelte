<script>
  import { supabase } from '$lib/supabase.js';
  import DynamicComponent from '$lib/DynamicComponent.svelte';

  let userPrompt = '';
  let messages = [];
  let generatedComponents = [];
  let activeTab = 'chat';
  let loading = false;
  let isGenerating = false;

  // Onglets
  const tabs = [
    { id: 'chat', label: 'Chat', icon: 'fas fa-comments' },
    { id: 'components', label: 'Composants', icon: 'fas fa-puzzle-piece' },
    { id: 'preview', label: 'Aperçu', icon: 'fas fa-eye' }
  ];

  // Détecter le type de composant
  function detectComponentType(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('bouton') || lower.includes('button')) return 'button';
    if (lower.includes('carte') || lower.includes('card')) return 'card';
    if (lower.includes('input') || lower.includes('champ') || lower.includes('formulaire')) return 'input';
    if (lower.includes('modal') || lower.includes('popup')) return 'modal';
    if (lower.includes('navigation') || lower.includes('menu')) return 'navigation';
    return 'generic';
  }

  // Envoyer un message et générer avec OpenAI
  async function sendMessage() {
    if (!userPrompt.trim() || loading) return;
    
    loading = true;
    isGenerating = true;

    // Ajouter le message utilisateur
    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userPrompt.trim(),
      timestamp: new Date()
    };
    messages = [...messages, userMessage];

    const currentPrompt = userPrompt;
    userPrompt = '';

    try {
      const componentType = detectComponentType(currentPrompt);
      
      // Appeler l'API OpenAI
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          type: componentType
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la génération');
      }

      // Ajouter la réponse IA avec le composant généré
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `✨ J'ai généré un composant ${componentType} avec OpenAI pour vous :`,
        component: {
          type: componentType,
          description: currentPrompt,
          code: result.code
        },
        timestamp: new Date()
      };

      messages = [...messages, aiResponse];
      generatedComponents = [...generatedComponents, aiResponse.component];

      // Sauvegarder dans Supabase
      try {
        await saveToSupabase(componentType, currentPrompt, result.code);
      } catch (error) {
        console.warn('Sauvegarde Supabase échouée:', error);
      }

    } catch (error) {
      console.error('Erreur génération:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Erreur lors de la génération: ${error.message}`,
        timestamp: new Date()
      };
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
      isGenerating = false;
    }
  }

  // Sauvegarder dans Supabase
  async function saveToSupabase(type, description, code) {
    try {
      const { data, error } = await supabase
        .from('components')
        .insert({
          name: `OpenAI ${type} - ${Date.now()}`,
          type: type,
          description: description,
          code: code,
          category: 'ai-generated',
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      console.log('✅ Composant sauvegardé:', data);
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde Supabase:', error);
    }
  }

  // Gestion des touches
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Charger les composants existants
  async function loadExistingComponents() {
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .in('category', ['generated', 'ai-generated'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        const components = data.map(c => ({
          type: c.type || 'generic',
          description: c.description || '',
          code: c.code || ''
        }));
        generatedComponents = [...components];
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement composants:', error);
    }
  }

  // Initialiser au démarrage
  loadExistingComponents();
</script>

<svelte:head>
  <title>Constructor v3 - Générateur IA OpenAI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 py-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <i class="fas fa-robot text-white"></i>
        </div>
        <div>
          <h1 class="text-xl font-bold text-gray-900">Constructor v3</h1>
          <p class="text-sm text-gray-500">Générateur de composants avec OpenAI GPT</p>
        </div>
      </div>
    </div>
  </header>

  <!-- Navigation tabs -->
  <div class="bg-white border-b">
    <div class="max-w-7xl mx-auto px-4">
      <nav class="flex space-x-8">
        {#each tabs as tab}
          <button
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors
              {activeTab === tab.id 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            on:click={() => activeTab = tab.id}
          >
            <i class="{tab.icon} mr-2"></i>
            {tab.label}
            {#if tab.id === 'components' && generatedComponents.length > 0}
              <span class="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                {generatedComponents.length}
              </span>
            {/if}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Contenu principal -->
  <main class="max-w-7xl mx-auto px-4 py-6">
    {#if activeTab === 'chat'}
      <!-- Interface de chat -->
      <div class="bg-white rounded-xl shadow-lg border h-[600px] flex flex-col">
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          {#if messages.length === 0}
            <div class="text-center py-12">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-magic text-white text-2xl"></i>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">Générateur OpenAI</h3>
              <p class="text-gray-600 mb-6">Décrivez le composant que vous voulez créer avec l'IA</p>
              
              <div class="flex flex-wrap justify-center gap-3">
                <button 
                  class="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                  on:click={() => userPrompt = 'Crée un bouton moderne avec effet de hover et icône'}
                >
                  <i class="fas fa-hand-pointer mr-2"></i>Bouton moderne
                </button>
                <button 
                  class="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
                  on:click={() => userPrompt = 'Carte produit avec image, titre, prix et bouton d\'achat'}
                >
                  <i class="fas fa-shopping-cart mr-2"></i>Carte produit
                </button>
                <button 
                  class="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition-colors"
                  on:click={() => userPrompt = 'Formulaire de contact avec validation visuelle'}
                >
                  <i class="fas fa-envelope mr-2"></i>Formulaire
                </button>
              </div>
            </div>
          {/if}

          {#each messages as message}
            <div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-4xl {message.type === 'user' 
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                : 'bg-gray-50 border'} rounded-xl px-4 py-3">
                
                <p class="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {#if message.component}
                  <div class="mt-4 p-4 bg-white rounded-lg border shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Aperçu généré par OpenAI
                      </span>
                      <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {message.component.type}
                      </span>
                    </div>
                    
                    <div class="border rounded-lg p-4 bg-gray-50">
                      <DynamicComponent code={message.component.code} />
                    </div>
                    
                    <details class="mt-3">
                      <summary class="text-xs text-gray-600 cursor-pointer hover:text-gray-800 select-none">
                        <i class="fas fa-code mr-1"></i>Voir le code source
                      </summary>
                      <pre class="mt-2 text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto"><code>{message.component.code}</code></pre>
                    </details>
                  </div>
                {/if}
              </div>
            </div>
          {/each}

          {#if isGenerating}
            <div class="flex justify-start">
              <div class="bg-gray-50 border rounded-xl px-4 py-3">
                <div class="flex items-center space-x-3">
                  <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                  </div>
                  <span class="text-sm text-gray-600">OpenAI génère votre composant...</span>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- Zone de saisie -->
        <div class="border-t p-4">
          <div class="flex space-x-3">
            <input
              bind:value={userPrompt}
              on:keydown={handleKeyDown}
              placeholder="Décrivez votre composant en détail (ex: bouton rouge avec icône et animation)..."
              class="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              disabled={loading}
            />
            <button
              on:click={sendMessage}
              disabled={!userPrompt.trim() || loading}
              class="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {#if loading}
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {:else}
                <i class="fas fa-magic"></i>
              {/if}
              <span>Générer</span>
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            <i class="fas fa-lightbulb mr-1"></i>
            Astuce: Soyez précis dans votre description pour de meilleurs résultats
          </p>
        </div>
      </div>

    {:else if activeTab === 'components'}
      <!-- Liste des composants générés -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each generatedComponents as component, i}
          <div class="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-gray-900">Composant #{i + 1}</h3>
              <div class="flex items-center space-x-2">
                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {component.type}
                </span>
                <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <i class="fas fa-robot mr-1"></i>OpenAI
                </span>
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">{component.description}</p>
            <div class="border rounded-lg p-3 bg-gray-50">
              <DynamicComponent code={component.code} />
            </div>
          </div>
        {:else}
          <div class="col-span-full text-center py-12">
            <i class="fas fa-cube text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun composant généré</h3>
            <p class="text-gray-500">Utilisez le chat pour créer vos premiers composants avec OpenAI</p>
          </div>
        {/each}
      </div>

    {:else if activeTab === 'preview'}
      <!-- Aperçu global -->
      <div class="bg-white rounded-xl shadow-sm border p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Aperçu global</h2>
          <span class="text-sm text-gray-500">
            {generatedComponents.length} composant{generatedComponents.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {#if generatedComponents.length > 0}
          <div class="space-y-8">
            {#each generatedComponents as component, i}
              <div class="border-l-4 border-blue-500 pl-6">
                <div class="flex items-center space-x-3 mb-3">
                  <h3 class="font-semibold text-gray-800">
                    {component.type.charAt(0).toUpperCase() + component.type.slice(1)} #{i + 1}
                  </h3>
                  <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    <i class="fas fa-robot mr-1"></i>OpenAI
                  </span>
                </div>
                <p class="text-sm text-gray-600 mb-4">{component.description}</p>
                <div class="border rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white">
                  <DynamicComponent code={component.code} />
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-16">
            <i class="fas fa-eye-slash text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun aperçu disponible</h3>
            <p class="text-gray-500">Générez des composants pour les voir ici</p>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
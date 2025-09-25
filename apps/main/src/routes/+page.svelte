<script>
  import { supabase } from '$lib/supabase.js';
  import DynamicComponent from '$lib/DynamicComponent.svelte';
  import { componentGenerator } from '$lib/componentGenerator.js';
  
  let userPrompt = '';
  let messages = [];
  let generatedComponents = [];
  let activeTab = 'chat';
  let loading = false;
  
  // Onglets simplifiés
  const tabs = [
    { id: 'chat', label: 'Chat', icon: 'fas fa-comments' },
    { id: 'components', label: 'Composants', icon: 'fas fa-puzzle-piece' },
    { id: 'preview', label: 'Aperçu', icon: 'fas fa-eye' }
  ];
  
  // Envoi de message et génération de composant
  async function sendMessage() {
    if (!userPrompt.trim() || loading) return;
    
    loading = true;
    
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
      // Analyser le prompt pour déterminer le type de composant
      const componentType = detectComponentType(currentPrompt);
      
      // Générer le composant
      const componentCode = await componentGenerator.generateComponent(
        currentPrompt,
        componentType,
        { style: 'modern', responsive: true }
      );
      
      // Ajouter la réponse IA avec le composant
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `J'ai généré un composant ${componentType} basé sur votre demande.`,
        component: {
          type: componentType,
          description: currentPrompt,
          code: componentCode
        },
        timestamp: new Date()
      };
      
      messages = [...messages, aiResponse];
      generatedComponents = [...generatedComponents, aiResponse.component];
      
      // Sauvegarder en base
      await saveToDatabase(componentType, currentPrompt, componentCode);
      
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Désolé, j'ai rencontré une erreur : ${error.message}`,
        timestamp: new Date()
      };
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
    }
  }
  
  function detectComponentType(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('bouton') || lowerPrompt.includes('button')) return 'button';
    if (lowerPrompt.includes('carte') || lowerPrompt.includes('card')) return 'card';
    if (lowerPrompt.includes('input') || lowerPrompt.includes('champ') || lowerPrompt.includes('formulaire')) return 'input';
    if (lowerPrompt.includes('modal') || lowerPrompt.includes('popup') || lowerPrompt.includes('dialogue')) return 'modal';
    if (lowerPrompt.includes('navigation') || lowerPrompt.includes('navbar') || lowerPrompt.includes('menu')) return 'navigation';
    if (lowerPrompt.includes('liste') || lowerPrompt.includes('tableau') || lowerPrompt.includes('grid')) return 'list';
    
    return 'generic';
  }
  
  async function saveToDatabase(type, description, code) {
    try {
      const { data, error } = await supabase
        .from('components')
        .insert({
          name: `Generated ${type} - ${Date.now()}`,
          type: type,
          category: 'generated',
          description: description,
          code: code,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  }
  
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
  
  // Charger les composants existants au démarrage
  async function loadExistingComponents() {
    try {
      const components = await componentGenerator.loadFromDatabase();
      generatedComponents = components.map(c => ({
        type: c.type,
        description: c.description,
        code: c.code
      }));
    } catch (error) {
      console.error('Erreur chargement composants:', error);
    }
  }
  
  // Charger au démarrage
  loadExistingComponents();
</script>

<svelte:head>
  <title>Constructor v3 - Générateur de Composants IA</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <i class="fas fa-cube text-white text-sm"></i>
          </div>
          <h1 class="text-xl font-bold text-gray-900">Constructor v3</h1>
          <span class="text-sm text-gray-500 bg-green-100 px-2 py-1 rounded">IA Générative</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Navigation des onglets -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8" aria-label="Tabs">
        {#each tabs as tab}
          <button
            class="py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 {activeTab === tab.id 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            on:click={() => activeTab = tab.id}
          >
            <i class="{tab.icon} mr-2"></i>
            {tab.label}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Contenu principal -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if activeTab === 'chat'}
      <!-- Interface de chat -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Zone de chat -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Messages -->
          <div class="bg-white rounded-lg border border-gray-200 h-96 overflow-y-auto p-4 space-y-4">
            {#if messages.length === 0}
              <div class="text-center text-gray-500 mt-20">
                <i class="fas fa-robot text-4xl mb-4"></i>
                <p class="text-lg">Décrivez le composant que vous souhaitez créer</p>
                <p class="text-sm">Exemples: "Crée un bouton bleu avec icône", "Une carte produit moderne", etc.</p>
              </div>
            {/if}
            
            {#each messages as message}
              <div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
                <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'}">
                  <p class="text-sm">{message.content}</p>
                  {#if message.component}
                    <div class="mt-3 p-3 bg-white rounded border text-gray-900">
                      <div class="text-xs text-gray-500 mb-2">Aperçu du composant:</div>
                      <DynamicComponent 
                        description={message.component.description}
                        type={message.component.type}
                        fallback="<div class='p-2 border rounded'>Composant généré</div>"
                      />
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
            
            {#if loading}
              <div class="flex justify-start">
                <div class="bg-gray-100 rounded-lg px-4 py-2">
                  <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
                    <div class="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
          
          <!-- Input utilisateur -->
          <div class="bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex space-x-3">
              <textarea
                bind:value={userPrompt}
                placeholder="Décrivez votre composant... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                class="flex-1 resize-none border-0 focus:ring-0 text-sm placeholder-gray-400"
                rows="3"
                on:keydown={handleKeyDown}
                disabled={loading}
              ></textarea>
              <button
                on:click={sendMessage}
                disabled={!userPrompt.trim() || loading}
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {#if loading}
                  <i class="fas fa-spinner fa-spin"></i>
                {:else}
                  <i class="fas fa-paper-plane"></i>
                {/if}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Panneau latéral -->
        <div class="space-y-6">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-lightbulb mr-2 text-yellow-500"></i>
              Suggestions
            </h3>
            <div class="space-y-2">
              {#each ['Bouton call-to-action moderne', 'Carte produit avec image', 'Formulaire de contact', 'Navigation responsive'] as suggestion}
                <button
                  class="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200 transition-colors"
                  on:click={() => userPrompt = suggestion}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              {/each}
            </div>
          </div>
          
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              <i class="fas fa-chart-bar mr-2 text-green-500"></i>
              Statistiques
            </h3>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Composants générés:</span>
                <span class="text-sm font-medium">{generatedComponents.length}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Messages échangés:</span>
                <span class="text-sm font-medium">{messages.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    {:else if activeTab === 'components'}
      <!-- Liste des composants générés -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900">Composants Générés</h2>
          <button 
            class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            on:click={() => componentGenerator.clearCache()}
          >
            <i class="fas fa-trash mr-2"></i>
            Vider le cache
          </button>
        </div>
        
        {#if generatedComponents.length === 0}
          <div class="text-center py-12">
            <i class="fas fa-puzzle-piece text-gray-400 text-5xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun composant généré</h3>
            <p class="text-gray-500">Commencez une conversation pour générer vos premiers composants.</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each generatedComponents as component, index}
              <div class="bg-white rounded-lg border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {component.type}
                  </span>
                </div>
                
                <h4 class="font-medium text-gray-900 mb-2">Composant #{index + 1}</h4>
                <p class="text-sm text-gray-600 mb-4 line-clamp-2">{component.description}</p>
                
                <!-- Aperçu du composant -->
                <div class="border border-gray-200 rounded p-3 mb-4">
                  <DynamicComponent 
                    description={component.description}
                    type={component.type}
                    fallback="<div class='text-xs text-gray-500'>Aperçu non disponible</div>"
                  />
                </div>
                
                <button class="w-full px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors">
                  <i class="fas fa-code mr-1"></i>
                  Voir le code
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
    {:else if activeTab === 'preview'}
      <!-- Aperçu global -->
      <div class="space-y-6">
        <h2 class="text-2xl font-bold text-gray-900">Aperçu en Temps Réel</h2>
        
        <div class="bg-white rounded-lg border border-gray-200 p-8 min-h-96">
          {#if generatedComponents.length === 0}
            <div class="text-center py-20">
              <i class="fas fa-eye text-gray-400 text-5xl mb-4"></i>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun aperçu disponible</h3>
              <p class="text-gray-500">Générez des composants pour les voir ici.</p>
            </div>
          {:else}
            <div class="space-y-8">
              {#each generatedComponents as component, index}
                <div class="border border-gray-200 rounded-lg p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="font-medium text-gray-900">Composant {index + 1} - {component.type}</h4>
                    <span class="text-xs text-gray-500">{component.description}</span>
                  </div>
                  
                  <DynamicComponent 
                    description={component.description}
                    type={component.type}
                    options={{style: 'preview', responsive: true}}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>
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
</style>

<div class="min-h-screen bg-gray-50">
  <!-- Interface principale style Bolt.new -->
  <div class="flex h-screen">
    <!-- Chat à gauche -->
    <div class="w-1/2 bg-white border-r border-gray-200 flex flex-col">
      <!-- Header du chat -->
      <div class="p-4 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">Assistant IA</h2>
        <p class="text-sm text-gray-600">Décrivez l'application que vous voulez créer</p>
      </div>
      
      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {#if messages.length === 0}
          <div class="text-center text-gray-500 mt-12">
            <i class="fas fa-robot text-6xl mb-4 text-gray-300"></i>
            <p class="text-lg mb-2">Bonjour ! Je suis votre assistant IA.</p>
            <p>Décrivez-moi l'application que vous voulez créer et je la générerai pour vous !</p>
          </div>
        {:else}
          {#each messages as message}
            <div class="flex {message.type === 'user' ? 'justify-end' : 'justify-start'}">
              <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg {message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'}">
                {message.content}
              </div>
            </div>
          {/each}
        {/if}
        
        {#if isGenerating}
          <div class="flex justify-start">
            <div class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Génération en cours...
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Input du chat -->
      <div class="p-4 border-t border-gray-200">
        <form on:submit|preventDefault={handleSendMessage} class="flex space-x-2">
          <input
            bind:value={userPrompt}
            placeholder="Ex: Créer un site e-commerce pour vendre des vêtements..."
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isGenerating}
          />
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGenerating || !userPrompt.trim()}
          >
            {#if isGenerating}
              <i class="fas fa-spinner fa-spin"></i>
            {:else}
              <i class="fas fa-paper-plane"></i>
            {/if}
          </button>
        </form>
      </div>
    </div>
    
    <!-- Preview à droite -->
    <div class="w-1/2 bg-white flex flex-col">
      <!-- Onglets -->
      <div class="flex border-b border-gray-200">
        {#each previewTabs as tab}
          <button
            class="px-4 py-3 font-medium text-sm border-b-2 {activePreviewTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
            on:click={() => activePreviewTab = tab.id}
          >
            <i class="{tab.icon} mr-2"></i>
            {tab.label}
          </button>
        {/each}
      </div>
      
      <!-- Contenu des onglets -->
      <div class="flex-1 overflow-hidden">
        {#if activePreviewTab === 'preview'}
          <div class="h-full bg-gray-100 flex items-center justify-center">
            <div class="text-center text-gray-500">
              <i class="fas fa-browser text-6xl mb-4 text-gray-300"></i>
              <p class="text-lg mb-2">Aperçu de l'Application</p>
              <p>L'aperçu de votre application apparaîtra ici après génération</p>
            </div>
          </div>
        {:else if activePreviewTab === 'code'}
          <div class="h-full p-4 overflow-y-auto bg-gray-900 text-gray-100">
            <pre class="text-sm"><code>{`<script>
  // Code généré par l'IA
  let message = 'Hello, World!';
</script>

<div class="container">
  <h1>{message}</h1>
  <p>Application générée automatiquement</p>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }
</style>`}</code></pre>
          </div>
        {:else if activePreviewTab === 'files'}
          <div class="h-full p-4 overflow-y-auto">
            <div class="space-y-2">
              {#each fileStructure as file}
                <div class="flex items-center text-sm">
                  <i class="fas fa-{file.type === 'folder' ? 'folder' : 'file'} mr-2 text-gray-600"></i>
                  {file.name}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import Input from '$lib/Input.svelte';
  import Modal from '$lib/Modal.svelte';
  import { supabase } from '$lib/supabase.js';
  
  let activeTab = 'dashboard';
  let stats = {
    totalProjects: 0,
    totalPrompts: 0,
    totalTemplates: 0,
    totalComponents: 0
  };
  
  let projects = [];
  let templates = [];
  let components = [];
  let usageStats = [];
  
  // Modales
  let showNewTemplateModal = false;
  let showNewComponentModal = false;
  let newTemplate = { name: '', type: 'e-commerce', description: '', structure: '' };
  let newComponent = { name: '', type: 'button', category: 'ui', code: '' };
  
  onMount(async () => {
    await loadDashboardData();
  });
  
  async function loadDashboardData() {
    try {
      // Charger les statistiques
      const [projectsRes, templatesRes, componentsRes, statsRes] = await Promise.all([
        supabase.from('projects').select('*').limit(5),
        supabase.from('templates').select('*'),
        supabase.from('components').select('*'),
        supabase.from('usage_stats').select('*').order('date', { ascending: false }).limit(7)
      ]);
      
      projects = projectsRes.data || [];
      templates = templatesRes.data || [];
      components = componentsRes.data || [];
      usageStats = statsRes.data || [];
      
      stats = {
        totalProjects: projects.length,
        totalPrompts: usageStats.reduce((sum, stat) => sum + (stat.total_prompts || 0), 0),
        totalTemplates: templates.length,
        totalComponents: components.length
      };
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }
  
  async function createTemplate() {
    if (!newTemplate.name || !newTemplate.description) return;
    
    try {
      let structure;
      try {
        structure = JSON.parse(newTemplate.structure || '{}');
      } catch {
        structure = { routes: [], components: [], features: [] };
      }
      
      const { error } = await supabase
        .from('templates')
        .insert([{
          name: newTemplate.name,
          type: newTemplate.type,
          description: newTemplate.description,
          structure: structure
        }]);
        
      if (error) throw error;
      
      newTemplate = { name: '', type: 'e-commerce', description: '', structure: '' };
      showNewTemplateModal = false;
      await loadDashboardData();
      
    } catch (error) {
      alert('Erreur lors de la création du template: ' + error.message);
    }
  }
  
  async function createComponent() {
    if (!newComponent.name || !newComponent.code) return;
    
    try {
      const { error } = await supabase
        .from('components')
        .insert([{
          name: newComponent.name,
          type: newComponent.type,
          category: newComponent.category,
          code: newComponent.code,
          props: {}
        }]);
        
      if (error) throw error;
      
      newComponent = { name: '', type: 'button', category: 'ui', code: '' };
      showNewComponentModal = false;
      await loadDashboardData();
      
    } catch (error) {
      alert('Erreur lors de la création du composant: ' + error.message);
    }
  }
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
  
  function getStatusBadge(status) {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      published: 'bg-blue-100 text-blue-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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
          <Button variant="secondary" size="sm">
            <i class="fas fa-download mr-2"></i>
            Exporter Données
          </Button>
          <Button size="sm">
            <i class="fas fa-sync mr-2"></i>
            Actualiser
          </Button>
        </div>
      </div>
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
                  <p class="font-medium text-gray-900">{project.name}</p>
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
                    <div class="text-sm font-medium text-gray-900">{project.name}</div>
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
        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
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
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Description du template..."
          bind:value={newTemplate.description}
          rows="3"
          required
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Structure (JSON)</label>
        <textarea
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
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
        <label class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
        <select
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
        <label class="block text-sm font-medium text-gray-700 mb-1">Code Svelte</label>
        <textarea
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="<script>
  // Props et logique
</script>

<button>
  <slot />
</button>"
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
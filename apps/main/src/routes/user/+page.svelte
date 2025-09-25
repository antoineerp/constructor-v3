<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  import Input from '$lib/Input.svelte';
  import Modal from '$lib/Modal.svelte';
  import { supabase } from '$lib/supabase.js';
  
  let projects = [];
  let showNewProjectModal = false;
  let newProject = {
    name: '',
    description: '',
    prompt: ''
  };
  let loading = false;
  
  onMount(async () => {
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
      
      // Simuler la génération de code (en attendant l'intégration OpenAI)
      const generatedCode = {
        'README.md': '# ' + newProject.name + '\n\n' + newProject.description + '\n\nGénéré avec Constructor V3',
        'src/app.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;'
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name: newProject.name,
            description: newProject.description,
            prompt_original: newProject.prompt,
            template_id: 1, // Template par défaut
            code_generated: generatedCode,
            status: 'draft'
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Reset form
      newProject = { name: '', description: '', prompt: '' };
      showNewProjectModal = false;
      
      // Reload projects
      await loadProjects();
      
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      alert('Erreur lors de la création du projet: ' + error.message);
    } finally {
      loading = false;
    }
  }
  
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
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Mes Projets</h1>
        <p class="text-gray-600">Gérez vos applications générées par IA</p>
      </div>
      
      <Button on:click={() => showNewProjectModal = true}>
        <i class="fas fa-plus mr-2"></i>
        Nouveau Projet
      </Button>
    </div>
    
    <!-- Statistiques rapides -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg mr-4">
            <i class="fas fa-project-diagram text-blue-600 text-xl"></i>
          </div>
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
        <label class="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
        <textarea
          class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Description de votre projet..."
          bind:value={newProject.description}
          rows="3"
        ></textarea>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Prompt IA</label>
        <textarea
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

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
<!-- Composant Dashboard principal avec stats et projets récents -->
<script>
  import Card from '$lib/Card.svelte';
  export let stats = { totalProjects: 0, totalPrompts: 0, totalTemplates: 0, totalComponents: 0 };
  export let projects = [];
  export let usageStats = [];
  export let formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');
  export let getStatusBadge = (status) => {
    const badges = { draft: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', published: 'bg-blue-100 text-blue-800' };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };
  export let shortId = (id) => id ? String(id).slice(0,8) : '';
  export let onCopyId = (id) => {};
</script>

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
            <p class="font-medium text-gray-900 flex items-center gap-2">
              {project.name}
              {#if project.id}
                <button 
                  class="text-[10px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300" 
                  title={project.id} 
                  on:click={() => onCopyId(project.id)}
                >
                  {shortId(project.id)}
                </button>
              {/if}
            </p>
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
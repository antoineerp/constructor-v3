<!-- Composant gestion des projets -->
<script>
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  
  export let projects = [];
  export let onCopyId = (id) => {};
  export let onViewProject = (project) => {};
  export let onDeleteProject = (project) => {};
  
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
  
  function shortId(id) { 
    return id ? String(id).slice(0,8) : ''; 
  }
</script>

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
              <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
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
              </div>
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
                <Button variant="secondary" size="sm" on:click={() => onViewProject(project)}>
                  <i class="fas fa-eye"></i>
                </Button>
                <Button variant="danger" size="sm" on:click={() => onDeleteProject(project)}>
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
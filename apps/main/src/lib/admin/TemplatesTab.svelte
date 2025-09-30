<!-- Composant gestion des templates -->
<script>
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  
  export let templates = [];
  export let onCreateTemplate = () => {};
  export let onEditTemplate = (template) => {};
  export let onDeleteTemplate = (template) => {};
</script>

<div class="flex items-center justify-between mb-6">
  <div>
    <h2 class="text-2xl font-bold text-gray-900">Templates</h2>
    <p class="text-gray-600">Gérez les templates de projets disponibles</p>
  </div>
  <Button on:click={onCreateTemplate}>
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
        <Button variant="secondary" size="sm" class="flex-1" on:click={() => onEditTemplate(template)}>
          <i class="fas fa-edit mr-1"></i>
          Modifier
        </Button>
        <Button variant="danger" size="sm" on:click={() => onDeleteTemplate(template)}>
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
    <Button on:click={onCreateTemplate}>
      Créer le premier template
    </Button>
  </Card>
{/if}
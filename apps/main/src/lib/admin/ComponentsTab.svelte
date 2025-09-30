<!-- Composant gestion des composants -->
<script>
  import Button from '$lib/Button.svelte';
  import Card from '$lib/Card.svelte';
  
  export let components = [];
  export let onCreateComponent = () => {};
  export let onViewComponent = (component) => {};
  export let onEditComponent = (component) => {};
  export let onDeleteComponent = (component) => {};
</script>

<div class="flex items-center justify-between mb-6">
  <div>
    <h2 class="text-2xl font-bold text-gray-900">Composants</h2>
    <p class="text-gray-600">Bibliothèque de composants réutilisables</p>
  </div>
  <Button on:click={onCreateComponent}>
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
{component.code.substring(0, 200)}{component.code.length > 200 ? '...' : ''}
        </pre>
      </div>
      
      <div class="flex space-x-2">
        <Button variant="secondary" size="sm" class="flex-1" on:click={() => onViewComponent(component)}>
          <i class="fas fa-code mr-1"></i>
          Voir Code
        </Button>
        <Button variant="secondary" size="sm" on:click={() => onEditComponent(component)}>
          <i class="fas fa-edit"></i>
        </Button>
        <Button variant="danger" size="sm" on:click={() => onDeleteComponent(component)}>
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
    <Button on:click={onCreateComponent}>
      Créer le premier composant
    </Button>
  </Card>
{/if}
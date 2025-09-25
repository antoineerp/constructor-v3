<!-- Tabs.svelte -->
<script lang="ts">
  export let tabs: Array<{ id: string; label: string; icon?: string }> = [];
  export let activeTab = tabs[0]?.id || '';
  export let size: 'sm' | 'md' | 'lg' = 'md';

  function selectTab(tabId: string) {
    activeTab = tabId;
  }
</script>

<div class="border-b border-gray-200">
  <nav class="flex space-x-1" aria-label="Tabs">
    {#each tabs as tab}
      <button
        type="button"
        class="
          {activeTab === tab.id
            ? 'border-primary-500 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
          {size === 'sm' ? 'px-3 py-1 text-sm' : size === 'lg' ? 'px-6 py-3 text-lg' : 'px-4 py-2 text-base'}
          border-b-2 font-medium transition-all duration-200 ease-in-out
          inline-flex items-center gap-2
        "
        aria-current={activeTab === tab.id ? 'page' : undefined}
        on:click={() => selectTab(tab.id)}
      >
        {#if tab.icon}
          <i class={tab.icon}></i>
        {/if}
        {tab.label}
      </button>
    {/each}
  </nav>
</div>

<div class="mt-4">
  <slot {activeTab} />
</div>
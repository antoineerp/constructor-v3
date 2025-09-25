<script>
  export let title = '';
  export let subtitle = '';
</script>

<div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
  {#if title}
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
      {#if subtitle}
        <p class="text-sm text-gray-600 mt-1">{subtitle}</p>
      {/if}
    </div>
  {/if}
  
  <div class="space-y-4">
    <slot />
  </div>
</div>
<script>
  export let type = 'text';
  export let placeholder = '';
  export let label = '';
  export let value = '';
  export let error = '';
  export let required = false;
  export let disabled = false;
</script>

<div class="w-full">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  
  <input 
    {type}
    {placeholder}
    bind:value
    {disabled}
    {required}
    class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed {error ? 'ring-2 ring-red-500 border-red-500' : ''} transition-colors"
    on:input
    on:change
  />
  
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>
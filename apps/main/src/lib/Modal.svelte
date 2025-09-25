<script>
  import { createEventDispatcher } from 'svelte';
  
  export let open = false;
  export let title = '';
  export let size = 'md';
  export let closeOnOverlay = true;
  
  const dispatch = createEventDispatcher();
  
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && closeOnOverlay) {
      close();
    }
  }
  
  function close() {
    open = false;
    dispatch('close');
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape' && open) {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="bg-white rounded-xl shadow-xl {sizes[size]} w-full transform transition-all">
      {#if title}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            type="button"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            on:click={close}
            aria-label="Fermer"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}
      
      <div class="p-6">
        <slot />
      </div>
      
      <slot name="footer" />
    </div>
  </div>
{/if}
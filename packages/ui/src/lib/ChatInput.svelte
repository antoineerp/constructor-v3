<!-- ChatInput.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    send: { message: string };
  }>();

  export let placeholder = "Décrivez l'application que vous voulez créer...";
  export let disabled = false;
  export let loading = false;

  let message = '';
  let textarea: HTMLTextAreaElement;

  function handleSubmit() {
    if (message.trim() && !disabled && !loading) {
      dispatch('send', { message: message.trim() });
      message = '';
      textarea.style.height = 'auto';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function autoResize() {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }
</script>

<div class="border-t border-gray-200 bg-white p-4">
  <form on:submit|preventDefault={handleSubmit} class="relative">
    <textarea
      bind:this={textarea}
      bind:value={message}
      on:input={autoResize}
      on:keydown={handleKeydown}
      {placeholder}
      {disabled}
      rows="1"
      class="
        w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12
        focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
        disabled:bg-gray-50 disabled:text-gray-500
        text-sm placeholder:text-gray-400
        max-h-[200px] overflow-y-auto
      "
    ></textarea>
    
    <button
      type="submit"
      disabled={!message.trim() || disabled || loading}
      class="
        absolute right-2 top-1/2 -translate-y-1/2
        w-8 h-8 rounded-md
        flex items-center justify-center
        {message.trim() && !disabled && !loading
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
        transition-all duration-200
      "
    >
      {#if loading}
        <i class="fas fa-spinner animate-spin text-sm"></i>
      {:else}
        <i class="fas fa-paper-plane text-sm"></i>
      {/if}
    </button>
  </form>
  
  <div class="mt-2 flex items-center justify-between text-xs text-gray-500">
    <span>Appuyez sur Entrée pour envoyer, Shift + Entrée pour une nouvelle ligne</span>
    <span>{message.length}/2000</span>
  </div>
</div>
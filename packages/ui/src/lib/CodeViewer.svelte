<!-- CodeViewer.svelte -->
<script lang="ts">
  export let code = '';
  export let language = 'javascript';
  export let filename = '';
  export let readonly = true;

  let copySuccess = false;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(code);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function getLanguageIcon(lang: string) {
    const icons: Record<string, string> = {
      'javascript': 'fab fa-js-square text-yellow-500',
      'typescript': 'fas fa-code text-blue-500', 
      'svelte': 'fas fa-fire text-red-500',
      'html': 'fab fa-html5 text-orange-500',
      'css': 'fab fa-css3-alt text-blue-600',
      'json': 'fas fa-brackets-curly text-gray-600',
      'markdown': 'fab fa-markdown text-gray-700'
    };
    return icons[lang] || 'fas fa-file-code text-gray-500';
  }
</script>

<div class="bg-white border rounded-lg overflow-hidden">
  {#if filename}
    <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
      <div class="flex items-center gap-2">
        <i class={getLanguageIcon(language)}></i>
        <span class="text-sm font-medium text-gray-700">{filename}</span>
        <span class="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
          {language}
        </span>
      </div>
      
      <button
        on:click={copyToClipboard}
        class="
          flex items-center gap-1 px-2 py-1 text-xs
          text-gray-600 hover:text-gray-900 hover:bg-gray-200
          rounded transition-colors
        "
        title="Copier le code"
      >
        {#if copySuccess}
          <i class="fas fa-check text-green-600"></i>
          <span class="text-green-600">Copié!</span>
        {:else}
          <i class="fas fa-copy"></i>
          <span>Copier</span>
        {/if}
      </button>
    </div>
  {/if}

  <div class="relative">
    <pre class="
      p-4 overflow-x-auto text-sm
      bg-gray-900 text-gray-100
      font-mono leading-relaxed
      max-h-96 overflow-y-auto
    "><code>{code}</code></pre>
    
    {#if !filename}
      <button
        on:click={copyToClipboard}
        class="
          absolute top-2 right-2
          w-8 h-8 rounded bg-gray-800/80 hover:bg-gray-700
          flex items-center justify-center
          text-gray-300 hover:text-white
          transition-colors
        "
        title="Copier le code"
      >
        {#if copySuccess}
          <i class="fas fa-check text-green-400 text-sm"></i>
        {:else}
          <i class="fas fa-copy text-sm"></i>
        {/if}
      </button>
    {/if}
  </div>
</div>
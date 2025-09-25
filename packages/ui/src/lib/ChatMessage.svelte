<!-- ChatMessage.svelte -->
<script lang="ts">
  export let message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  };
  export let isTyping = false;

  function formatTime(date: Date) {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
</script>

<div class="flex gap-3 py-4 px-4 hover:bg-gray-50/50 transition-colors">
  <div class="flex-shrink-0">
    <div class="
      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
      {message.role === 'user' 
        ? 'bg-primary-100 text-primary-700' 
        : message.role === 'assistant'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'}
    ">
      {#if message.role === 'user'}
        <i class="fas fa-user"></i>
      {:else if message.role === 'assistant'}
        <i class="fas fa-robot"></i>
      {:else}
        <i class="fas fa-cog"></i>
      {/if}
    </div>
  </div>
  
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-sm font-medium text-gray-900">
        {message.role === 'user' ? 'Vous' : message.role === 'assistant' ? 'Assistant' : 'Système'}
      </span>
      <span class="text-xs text-gray-500">
        {formatTime(message.timestamp)}
      </span>
    </div>
    
    <div class="text-sm text-gray-700 break-words">
      {#if isTyping}
        <div class="flex items-center gap-1">
          <span>{message.content}</span>
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      {:else}
        <div class="prose prose-sm max-w-none">
          {@html message.content.replace(/\n/g, '<br>')}
        </div>
      {/if}
    </div>
  </div>
</div>
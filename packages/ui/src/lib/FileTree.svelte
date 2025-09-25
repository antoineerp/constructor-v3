<!-- FileTree.svelte -->
<script lang="ts">
  export let files: Array<{
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: Array<any>;
    content?: string;
  }> = [];
  
  export let selectedFile = '';
  
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    select: { file: any };
  }>();

  let expandedFolders = new Set(['src', 'routes', 'lib']);

  function toggleFolder(path: string) {
    if (expandedFolders.has(path)) {
      expandedFolders.delete(path);
    } else {
      expandedFolders.add(path);
    }
    expandedFolders = expandedFolders;
  }

  function selectFile(file: any) {
    if (file.type === 'file') {
      selectedFile = file.path;
      dispatch('select', { file });
    } else {
      toggleFolder(file.path);
    }
  }

  function getFileIcon(filename: string, type: string) {
    if (type === 'folder') {
      return 'fas fa-folder text-blue-500';
    }
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      'js': 'fab fa-js-square text-yellow-500',
      'ts': 'fas fa-code text-blue-500',
      'svelte': 'fas fa-fire text-red-500',
      'html': 'fab fa-html5 text-orange-500',
      'css': 'fab fa-css3-alt text-blue-600',
      'json': 'fas fa-brackets-curly text-gray-600',
      'md': 'fab fa-markdown text-gray-700',
      'png': 'fas fa-image text-green-500',
      'jpg': 'fas fa-image text-green-500',
      'jpeg': 'fas fa-image text-green-500',
      'svg': 'fas fa-vector-square text-purple-500'
    };
    
    return icons[ext || ''] || 'fas fa-file text-gray-500';
  }

  function renderFiles(fileList: any[], depth = 0) {
    return fileList.map(file => ({
      ...file,
      depth,
      isExpanded: file.type === 'folder' && expandedFolders.has(file.path)
    }));
  }
</script>

<div class="bg-white border-r border-gray-200 overflow-hidden">
  <div class="px-3 py-2 border-b border-gray-200 bg-gray-50">
    <h3 class="text-sm font-medium text-gray-700 flex items-center gap-2">
      <i class="fas fa-folder-tree text-gray-500"></i>
      Structure du projet
    </h3>
  </div>
  
  <div class="p-2 space-y-1 max-h-96 overflow-y-auto">
    {#each renderFiles(files) as file}
      <div>
        <button
          type="button"
          on:click={() => selectFile(file)}
          class="
            w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
            hover:bg-gray-100 transition-colors text-left
            {selectedFile === file.path ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}
          "
          style="padding-left: {file.depth * 16 + 8}px"
        >
          {#if file.type === 'folder'}
            <i class="
              fas fa-chevron-{file.isExpanded ? 'down' : 'right'} 
              text-xs text-gray-400 w-3
            "></i>
          {:else}
            <span class="w-3"></span>
          {/if}
          
          <i class={getFileIcon(file.name, file.type)}></i>
          <span class="truncate">{file.name}</span>
        </button>
        
        {#if file.type === 'folder' && file.children && file.isExpanded}
          <svelte:self files={file.children} {selectedFile} depth={file.depth + 1} on:select />
        {/if}
      </div>
    {/each}
  </div>
  
  {#if files.length === 0}
    <div class="p-4 text-center text-gray-500 text-sm">
      <i class="fas fa-folder-open text-2xl mb-2 block"></i>
      Aucun fichier généré
    </div>
  {/if}
</div>
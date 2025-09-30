<!-- Composant diagnostic système -->
<script>
  import Card from '$lib/Card.svelte';
  
  export let diagnosticData = null;
  export let diagnosticLoading = false;  
  export let diagnosticError = '';
  export let onLoadDiagnostic = () => {};
  
  function formatBytes(n) { 
    if(!n && n!==0) return ''; 
    const u=['B','KB','MB','GB']; 
    let i=0, v=n; 
    while(v>=1024 && i<u.length-1){ v/=1024; i++; } 
    return (i? v.toFixed(1): v)+' '+u[i]; 
  }
</script>

<Card title="Diagnostic Compilation" subtitle="État des systèmes de compilation Svelte">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-3">
      {#if diagnosticLoading}
        <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-600">Diagnostic en cours...</span>
      {:else if diagnosticData}
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full {diagnosticData.status === 'healthy' ? 'bg-green-500' : diagnosticData.status === 'issues_detected' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
          <span class="text-sm font-medium {diagnosticData.status === 'healthy' ? 'text-green-700' : diagnosticData.status === 'issues_detected' ? 'text-yellow-700' : 'text-red-700'}">
            {diagnosticData.status === 'healthy' ? 'Système opérationnel' : diagnosticData.status === 'issues_detected' ? 'Problèmes détectés' : 'Erreur système'}
          </span>
        </div>
      {/if}
    </div>
    <button 
      class="text-xs px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-40" 
      on:click={onLoadDiagnostic} 
      disabled={diagnosticLoading}
    >
      {diagnosticLoading ? 'Test...' : 'Tester'}
    </button>
  </div>

  {#if diagnosticError}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
      <strong>Erreur:</strong> {diagnosticError}
    </div>
  {/if}

  {#if diagnosticData}
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Svelte Info -->
      <div class="space-y-4">
        <h3 class="font-semibold text-gray-800 flex items-center gap-2">
          <i class="fas fa-code-branch text-purple-600"></i>
          Svelte Runtime
        </h3>
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="grid grid-cols-2 gap-2">
            <span class="text-gray-600">Version:</span>
            <code class="bg-white px-2 py-1 rounded text-xs">{diagnosticData.svelte?.version || 'N/A'}</code>
          </div>
          {#if diagnosticData.svelte?.resolvedPath}
            <div class="grid grid-cols-2 gap-2 mt-2">
              <span class="text-gray-600">Chemin:</span>
              <code class="bg-white px-2 py-1 rounded text-xs text-green-700">{diagnosticData.svelte.resolvedPath}</code>
            </div>
          {/if}
        </div>

        <!-- Modules disponibles -->
        <div>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Modules Internes</h4>
          <div class="space-y-1 text-xs">
            {#each Object.entries(diagnosticData.modules?.available || {}) as [path, info]}
              <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code class="text-gray-700 flex-1 mr-2">{path.replace('node_modules/', '').replace('.ignored/', '')}</code>
                <div class="flex items-center gap-1">
                  <div class="w-2 h-2 rounded-full {info.exists ? 'bg-green-500' : 'bg-red-500'}"></div>
                  {#if info.exists && info.size}
                    <span class="text-gray-500">{formatBytes(info.size)}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Tests Compilation -->
      <div class="space-y-4">
        <h3 class="font-semibold text-gray-800 flex items-center gap-2">
          <i class="fas fa-cogs text-blue-600"></i>
          Tests Compilation
        </h3>
        
        <div class="space-y-3">
          <div class="p-3 bg-gray-50 rounded">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">DOM Compiler</span>
              <div class="w-2 h-2 rounded-full {diagnosticData.runtime?.simpleCompile?.success ? 'bg-green-500' : 'bg-red-500'}"></div>
            </div>
            {#if diagnosticData.runtime?.simpleCompile?.success}
              <div class="text-xs text-gray-600">
                JS: {formatBytes(diagnosticData.runtime.simpleCompile.jsSize)} | 
                CSS: {formatBytes(diagnosticData.runtime.simpleCompile.cssSize)} |
                Imports: {diagnosticData.runtime.simpleCompile.hasImports ? 'Oui' : 'Non'}
              </div>
            {:else}
              <div class="text-xs text-red-600">{diagnosticData.runtime?.simpleCompile?.error || 'Échec'}</div>
            {/if}
          </div>

          <div class="p-3 bg-gray-50 rounded">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium">SSR Compiler</span>
              <div class="w-2 h-2 rounded-full {diagnosticData.runtime?.ssrCompile?.success ? 'bg-green-500' : 'bg-red-500'}"></div>
            </div>
            {#if diagnosticData.runtime?.ssrCompile?.success}
              <div class="text-xs text-gray-600">JS: {formatBytes(diagnosticData.runtime.ssrCompile.jsSize)}</div>
            {:else}
              <div class="text-xs text-red-600">{diagnosticData.runtime?.ssrCompile?.error || 'Échec'}</div>
            {/if}
          </div>
        </div>

        <!-- Imports détectés -->
        {#if diagnosticData.runtime?.detectedImports?.length}
          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-2">Imports Générés</h4>
            <div class="max-h-32 overflow-auto">
              {#each diagnosticData.runtime.detectedImports as imp}
                <code class="block text-xs bg-gray-900 text-gray-100 p-1 rounded mb-1">{imp}</code>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- État Global -->
    <div class="mt-6 pt-4 border-t border-gray-200">
      <h3 class="font-semibold text-gray-800 mb-3">État Runtime</h3>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div class="bg-blue-50 p-3 rounded text-center">
          <div class="text-lg font-bold text-blue-600">{diagnosticData.runtime?.globalState?.compileRequests || 0}</div>
          <div class="text-xs text-blue-700">Requêtes Compile</div>
        </div>
        <div class="bg-green-50 p-3 rounded text-center">
          <div class="text-lg font-bold text-green-600">{diagnosticData.runtime?.globalState?.runtimeBundles || 0}</div>
          <div class="text-xs text-green-700">Bundles Cache</div>
        </div>
        <div class="bg-purple-50 p-3 rounded text-center">
          <div class="text-lg font-bold text-purple-600">{diagnosticData.runtime?.globalState?.tailwindCache || 0}</div>
          <div class="text-xs text-purple-700">CSS Cache</div>
        </div>
      </div>
    </div>

    <!-- Problèmes détectés -->
    {#if diagnosticData.issues?.length}
      <div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 class="font-medium text-yellow-800 mb-2 flex items-center gap-2">
          <i class="fas fa-exclamation-triangle"></i>
          Problèmes Détectés ({diagnosticData.issues.length})
        </h4>
        <ul class="text-sm text-yellow-700 space-y-1">
          {#each diagnosticData.issues as issue}
            <li class="flex items-start gap-2">
              <i class="fas fa-circle text-xs mt-1.5 text-yellow-500"></i>
              {issue}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="mt-4 text-xs text-gray-500 flex justify-between">
      <span>Diagnostic: {diagnosticData.timestamp}</span>
      <span>Runtime Node.js: {diagnosticData.runtime?.nodeVersion || 'N/A'}</span>
    </div>
  {:else if !diagnosticLoading}
    <div class="text-center py-8">
      <i class="fas fa-stethoscope text-gray-400 text-4xl mb-4"></i>
      <p class="text-gray-500 mb-4">Cliquez sur "Tester" pour diagnostiquer les systèmes de compilation</p>
      <button class="px-4 py-2 bg-blue-600 text-white rounded" on:click={onLoadDiagnostic}>
        Lancer Diagnostic
      </button>
    </div>
  {/if}
</Card>
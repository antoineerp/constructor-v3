<script>
  import { supabase } from '$lib/supabase.js';
  export let provider = 'openai';

  let userPrompt = '';
  let messages = [];
  let loading = false;
  let errorMsg = '';

  function detectComponentType(prompt) {
    const lower = prompt.toLowerCase();
    if (lower.includes('bouton') || lower.includes('button')) return 'button';
    if (lower.includes('carte') || lower.includes('card')) return 'card';
    if (lower.includes('input') || lower.includes('champ') || lower.includes('formulaire')) return 'input';
    if (lower.includes('modal') || lower.includes('popup')) return 'modal';
    if (lower.includes('navigation') || lower.includes('menu')) return 'navigation';
    return 'generic';
  }

  async function sendMessage() {
    if (!userPrompt.trim() || loading) return;
    loading = true;
    errorMsg = '';
    const currentPrompt = userPrompt.trim();
    userPrompt = '';
    try {
      const componentType = detectComponentType(currentPrompt);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt, type: componentType, provider })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur génération');
      messages = [...messages, { type: 'user', content: currentPrompt }, { type: 'ai', content: result.code, componentType }];
    } catch (e) {
      errorMsg = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="p-4 border rounded bg-white shadow-sm mb-6">
  <h2 class="text-lg font-bold mb-2 flex items-center gap-2"><i class="fas fa-comments text-indigo-600"></i> Génération de composants (Chat)</h2>
  <div class="flex gap-2 mb-3">
    <input type="text" bind:value={userPrompt} placeholder="Décris un composant (ex: bouton primaire)" class="flex-1 px-3 py-2 border rounded" on:keydown={(e)=>e.key==='Enter' && sendMessage()} />
    <button class="px-4 py-2 bg-indigo-600 text-white rounded" on:click={sendMessage} disabled={loading}>Envoyer</button>
  </div>
  {#if errorMsg}
    <div class="text-sm text-red-600 mb-2">{errorMsg}</div>
  {/if}
  <div class="space-y-3">
    {#each messages as m}
      {#if m.type==='user'}
        <div class="text-xs text-gray-700"><strong>Utilisateur:</strong> {m.content}</div>
      {:else}
        <div class="text-xs bg-gray-50 p-2 rounded border"><strong>IA ({m.componentType}):</strong>
          <pre class="text-xs whitespace-pre-wrap">{m.content}</pre>
        </div>
      {/if}
    {/each}
  </div>
</div>

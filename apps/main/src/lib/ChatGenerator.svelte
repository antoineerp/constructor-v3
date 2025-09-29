<script>
  export let provider = 'openai';

  let userPrompt = '';
  let messages = [];
  let loading = false;
  let errorMsg = '';
  let expandedPrompt = '';
  let showAdvanced = false;
  let generationType = 'component'; // 'component' | 'app' | 'feature'

  // Intelligence de détection contextuelle (bolt.new style)
  function analyzePromptContext(prompt) {
    const lower = prompt.toLowerCase();
    const words = lower.split(/\s+/);
    
    // Détection type génération
    const appKeywords = ['site', 'application', 'app', 'dashboard', 'plateforme', 'système', 'crm', 'blog', 'e-commerce', 'marketplace'];
    const featureKeywords = ['page', 'section', 'module', 'fonctionnalité', 'workflow', 'processus'];
    const componentKeywords = ['composant', 'bouton', 'carte', 'modal', 'input', 'formulaire', 'navbar', 'sidebar'];
    
    let detectedType = 'component';
    let complexity = 'simple';
    let domain = 'generic';
    let techLevel = 'basic';
    
    // Analyse type
    if (appKeywords.some(k => lower.includes(k))) detectedType = 'app';
    else if (featureKeywords.some(k => lower.includes(k))) detectedType = 'feature';
    
    // Analyse complexité 
    const complexityIndicators = ['avancé', 'complexe', 'complet', 'professionnel', 'entreprise', 'multi-tenant', 'scalable'];
    if (complexityIndicators.some(k => lower.includes(k))) complexity = 'advanced';
    else if (words.length > 10) complexity = 'medium';
    
    // Détection domaine
    if (lower.match(/\b(crm|client|vente|commercial|lead|pipeline)\b/)) domain = 'business';
    else if (lower.match(/\b(blog|article|contenu|cms|publication)\b/)) domain = 'content';
    else if (lower.match(/\b(e-commerce|boutique|produit|panier|commande)\b/)) domain = 'ecommerce';
    else if (lower.match(/\b(dashboard|admin|gestion|analytics|kpi)\b/)) domain = 'admin';
    else if (lower.match(/\b(finance|comptabilité|facture|devis|paiement)\b/)) domain = 'finance';
    
    // Détection niveau technique
    if (lower.match(/\b(api|rest|graphql|websocket|microservice|auth|jwt|oauth)\b/)) techLevel = 'technical';
    else if (lower.match(/\b(responsive|seo|ux|ui|accessibilité|performance)\b/)) techLevel = 'design';
    
    return { detectedType, complexity, domain, techLevel, wordCount: words.length };
  }

  // Expansion intelligente du prompt (comme bolt.new)
  function expandPrompt(originalPrompt, context) {
    let expanded = originalPrompt;
    
    // Ajouts contextuels selon le domaine
    const domainExpansions = {
      business: "Inclure gestion des données clients, workflow de vente, tableaux de bord KPI appropriés",
      content: "Prévoir système de publication, catégories, tags, SEO-friendly, interface d'édition",
      ecommerce: "Intégrer catalogue produits, panier, checkout, gestion des commandes, paiements",
      admin: "Dashboard avec métriques, tables de données, filtres, exports, permissions utilisateur",
      finance: "Calculs automatiques, formatage monétaire, rapports, conformité comptable"
    };
    
    // Ajouts techniques selon niveau
    const techExpansions = {
      technical: "API REST bien structurée, authentification sécurisée, gestion d'état optimale",
      design: "Interface moderne responsive, UX intuitive, accessibilité WCAG, performances optimisées",
      basic: "Design clair utilisant Tailwind CSS, composants réutilisables, structure simple"
    };
    
    // Construction du prompt enrichi
    if (context.detectedType === 'app') {
      expanded += `\n\nCONTEXTE APPLICATION:`;
      expanded += `\n- Type: ${context.domain} (complexité ${context.complexity})`;
      expanded += `\n- Fonctionnalités: ${domainExpansions[context.domain] || 'Interface moderne et fonctionnelle'}`;
      expanded += `\n- Technique: ${techExpansions[context.techLevel] || techExpansions.basic}`;
      
      if (context.complexity === 'advanced') {
        expanded += `\n- Architecture: Multi-pages, composants réutilisables, gestion d'état avancée`;
      }
    } else if (context.detectedType === 'feature') {
      expanded += `\n\nCONTEXTE FONCTIONNALITÉ:`;
      expanded += `\n- Intégration dans ${context.domain} workflow`;
      expanded += `\n- Niveau: ${context.complexity}`;
    }
    
    return expanded.trim();
  }

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
    expandedPrompt = '';
    
    const originalPrompt = userPrompt.trim();
    userPrompt = '';
    
    try {
      // Analyse contextuelle du prompt (bolt.new style)
      const context = analyzePromptContext(originalPrompt);
      
      // Enrichissement avancé via IA (comme bolt.new)
      let enrichedData = null;
      try {
        const enrichResponse = await fetch('/api/prompt/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: originalPrompt, 
            context: context, 
            provider 
          })
        });
        if (enrichResponse.ok) {
          enrichedData = await enrichResponse.json();
          if (enrichedData.success) {
            expandedPrompt = enrichedData.enrichedPrompt;
          }
        }
      } catch (e) {
        console.warn('Enrichissement prompt échoué:', e.message);
      }
      
      // Fallback si enrichissement échoué
      if (!expandedPrompt) {
        expandedPrompt = expandPrompt(originalPrompt, context);
      }
      
      let result;
      
      if (context.detectedType === 'app') {
        // Génération application complète
        const response = await fetch('/api/generate/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: expandedPrompt,
            provider,
            context: context
          })
        });
        result = await response.json();
        
        if (!response.ok || !result.success) throw new Error(result.error || 'Erreur génération app');
        
        messages = [...messages, 
          { type: 'user', content: originalPrompt },
          { 
            type: 'ai', 
            content: result.files ? Object.keys(result.files).join(', ') : 'Application générée',
            appType: 'application',
            files: result.files,
            context: context,
            expandedPrompt: expandedPrompt,
            enrichedData: enrichedData,
            nextSteps: enrichedData?.suggestions?.nextSteps || []
          }
        ];
        
      } else {
        // Génération composant (existant)
        const componentType = detectComponentType(originalPrompt);
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: context.complexity === 'simple' ? originalPrompt : expandedPrompt, 
            type: componentType, 
            provider 
          })
        });
        result = await response.json();
        
        if (!response.ok || !result.success) throw new Error(result.error || 'Erreur génération');
        
        messages = [...messages, 
          { type: 'user', content: originalPrompt }, 
          { 
            type: 'ai', 
            content: result.code, 
            componentType: componentType,
            context: context,
            expandedPrompt: expandedPrompt,
            enrichedData: enrichedData,
            nextSteps: enrichedData?.suggestions?.nextSteps || []
          }
        ];
      }
      
    } catch (e) {
      errorMsg = e.message;
    } finally {
      loading = false;
    }
  }

  function clearChat() {
    messages = [];
    errorMsg = '';
    expandedPrompt = '';
  }

  // Suggestions intelligentes selon contexte
  $: suggestions = messages.length === 0 ? [
    "Crée un CRM simple pour gérer mes clients",
    "Blog moderne avec système de tags",
    "Dashboard analytics avec graphiques",
    "E-commerce produits artisanaux",
    "Bouton avec loading state",
    "Modal de confirmation élégante"
  ] : [];
</script>

<div class="p-4 border rounded bg-white shadow-sm mb-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-bold flex items-center gap-2">
      <i class="fas fa-robot text-indigo-600"></i> 
      Assistant IA Constructor
    </h2>
    <div class="flex items-center gap-2">
      <button 
        class="text-xs px-2 py-1 rounded border {showAdvanced ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'}"
        on:click={() => showAdvanced = !showAdvanced}
      >
        {showAdvanced ? 'Masquer détails' : 'Voir détails'}
      </button>
      {#if messages.length > 0}
        <button 
          class="text-xs px-2 py-1 rounded border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          on:click={clearChat}
        >
          Effacer
        </button>
      {/if}
    </div>
  </div>

  <!-- Zone de saisie principale -->
  <div class="flex gap-2 mb-3">
    <input 
      type="text" 
      bind:value={userPrompt} 
      placeholder="Décris ton projet : app complète, fonctionnalité ou composant..." 
      class="flex-1 px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
      on:keydown={(e) => e.key === 'Enter' && sendMessage()} 
    />
    <button 
      class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50" 
      on:click={sendMessage} 
      disabled={loading}
    >
      {loading ? 'Génération...' : 'Générer'}
    </button>
  </div>

  <!-- Suggestions rapides -->
  {#if suggestions.length > 0}
    <div class="mb-3">
      <div class="text-xs text-gray-500 mb-1">Suggestions :</div>
      <div class="flex flex-wrap gap-1">
        {#each suggestions as suggestion}
          <button 
            class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
            on:click={() => { userPrompt = suggestion; sendMessage(); }}
          >
            {suggestion}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Détails techniques avancés -->
  {#if showAdvanced && expandedPrompt}
    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
      <div class="font-semibold text-blue-800 mb-1">Prompt enrichi :</div>
      <div class="text-blue-700 whitespace-pre-wrap">{expandedPrompt}</div>
    </div>
  {/if}

  <!-- Messages d'erreur -->
  {#if errorMsg}
    <div class="text-sm text-red-600 mb-2 p-2 bg-red-50 border border-red-200 rounded">{errorMsg}</div>
  {/if}

  <!-- Historique de conversation -->
  <div class="space-y-3 max-h-96 overflow-y-auto">
    {#each messages as m}
      {#if m.type === 'user'}
        <div class="bg-gray-50 p-3 rounded">
          <div class="text-xs text-gray-500 mb-1">Vous :</div>
          <div class="text-sm text-gray-800">{m.content}</div>
        </div>
      {:else}
        <div class="bg-indigo-50 p-3 rounded">
          <div class="text-xs text-indigo-600 mb-1 flex items-center justify-between">
            <span>IA ({m.appType || m.componentType || 'réponse'}) :</span>
            {#if showAdvanced && m.context}
              <span class="text-[10px] px-1 py-0.5 bg-indigo-100 rounded">
                {m.context.detectedType} • {m.context.complexity} • {m.context.domain}
              </span>
            {/if}
          </div>
          {#if m.files}
            <div class="text-sm text-indigo-800 mb-2">
              Application générée ({Object.keys(m.files).length} fichiers) :
            </div>
            <div class="text-xs text-indigo-700 grid grid-cols-2 gap-1 mb-2">
              {#each Object.keys(m.files).slice(0, 8) as filename}
                <div class="px-2 py-1 bg-indigo-100 rounded truncate">{filename}</div>
              {/each}
              {#if Object.keys(m.files).length > 8}
                <div class="px-2 py-1 bg-indigo-100 rounded text-center">+{Object.keys(m.files).length - 8} autres</div>
              {/if}
            </div>
            <!-- Suggestions d'étapes suivantes -->
            {#if m.nextSteps && m.nextSteps.length > 0}
              <div class="mt-2 border-t border-indigo-200 pt-2">
                <div class="text-xs text-indigo-600 mb-1 font-medium">Étapes suivantes suggérées :</div>
                <div class="flex flex-wrap gap-1">
                  {#each m.nextSteps.slice(0, 4) as step}
                    <button 
                      class="text-xs px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-700 border border-indigo-200"
                      on:click={() => { userPrompt = step; }}
                    >
                      {step}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {:else}
            <pre class="text-xs whitespace-pre-wrap text-indigo-800 bg-white p-2 rounded border max-h-32 overflow-y-auto">{m.content}</pre>
            <!-- Suggestions pour composants -->
            {#if m.nextSteps && m.nextSteps.length > 0}
              <div class="mt-2 border-t border-indigo-200 pt-2">
                <div class="text-xs text-indigo-600 mb-1 font-medium">Suggestions :</div>
                <div class="flex flex-wrap gap-1">
                  {#each m.nextSteps.slice(0, 3) as step}
                    <button 
                      class="text-xs px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-indigo-700"
                      on:click={() => { userPrompt = step; }}
                    >
                      {step}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  {#if loading}
    <div class="mt-3 text-center">
      <div class="text-xs text-gray-500 flex items-center justify-center gap-2">
        <i class="fas fa-cog fa-spin"></i> 
        Génération en cours...
      </div>
    </div>
  {/if}
</div>

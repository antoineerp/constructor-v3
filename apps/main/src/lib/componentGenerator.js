// Service de génération de composants dynamique
import { supabase } from './supabase.js';

export class ComponentGenerator {
  constructor() {
    this.cache = new Map();
    this.generating = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Vérifier si la table existe, sinon la créer
      const { data, error } = await supabase
        .from('generated_components')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Table n'existe pas, on va utiliser la table components existante
        console.log('Utilisation de la table components existante');
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('Erreur initialisation ComponentGenerator:', error);
      this.initialized = true; // Continuer même en cas d'erreur
    }
  }

  /**
   * Génère un composant Svelte à partir d'une description
   * @param {string} description - Description du composant souhaité
   * @param {string} type - Type de composant (button, card, input, etc.)
   * @param {Object} options - Options supplémentaires (style, props, etc.)
   * @returns {Promise<string>} Code Svelte du composant
   */
  async generateComponent(description, type = 'generic', options = {}) {
    await this.init();
    
    const cacheKey = `${type}-${description}-${JSON.stringify(options)}`;
    
    // Vérifier le cache d'abord
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Éviter les générations multiples simultanées
    if (this.generating.has(cacheKey)) {
      return this.generating.get(cacheKey);
    }

    const generationPromise = this._performGeneration(description, type, options);
    this.generating.set(cacheKey, generationPromise);

    try {
      const result = await generationPromise;
      this.cache.set(cacheKey, result);
      this.generating.delete(cacheKey);
      return result;
    } catch (error) {
      this.generating.delete(cacheKey);
      throw error;
    }
  }

  async _performGeneration(description, type, options) {
    const prompt = this._buildPrompt(description, type, options);
    
    try {
      // Simuler un appel API pour la génération de composant
      // Dans un vrai projet, ici vous appelleriez votre API IA (OpenAI, Claude, etc.)
      const response = await this._callAIService(prompt);
      
      // Valider et nettoyer le code généré
      const cleanedCode = this._validateAndCleanCode(response);
      
      // Optionnel : sauvegarder en base pour réutilisation future
      await this._saveToDatabase(description, type, cleanedCode, options);
      
      return cleanedCode;
    } catch (error) {
      console.error('Erreur lors de la génération du composant:', error);
      // Fallback vers un composant basique
      return this._getFallbackComponent(type);
    }
  }

  _buildPrompt(description, type, options) {
    return `
Génère un composant Svelte ${type} basé sur cette description : "${description}"

Contraintes :
- Code Svelte valid et moderne
- TailwindCSS pour le style
- Props exportées avec export let
- Accessibilité (ARIA labels, tabindex si nécessaire)
- Pas d'imports externes autres que Svelte
- Responsive design
- ${options.style ? `Style spécifique : ${options.style}` : 'Style moderne et élégant'}

Options supplémentaires : ${JSON.stringify(options)}

Structure attendue :
<script>
  // Props et logique
</script>

<!-- Template HTML avec classes TailwindCSS -->

<style>
  /* CSS personnalisé si nécessaire */
</style>

Code uniquement, pas d'explication :
`;
  }

  async _callAIService(prompt) {
    // Pour la démo, retournons des composants pré-définis intelligents
    // Dans un vrai projet, ici vous feriez appel à votre API IA (OpenAI, Claude, etc.)
    
    // Analyser le prompt pour comprendre le besoin
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('bouton') || lowerPrompt.includes('button')) {
      return this._generateButtonComponent(lowerPrompt);
    } else if (lowerPrompt.includes('carte') || lowerPrompt.includes('card')) {
      return this._generateCardComponent(lowerPrompt);
    } else if (lowerPrompt.includes('input') || lowerPrompt.includes('champ') || lowerPrompt.includes('formulaire')) {
      return this._generateInputComponent(lowerPrompt);
    } else if (lowerPrompt.includes('modal') || lowerPrompt.includes('popup')) {
      return this._generateModalComponent(lowerPrompt);
    } else if (lowerPrompt.includes('navigation') || lowerPrompt.includes('navbar')) {
      return this._generateNavigationComponent(lowerPrompt);
    }
    
    // Fallback générique
    return this._generateGenericComponent(lowerPrompt);
  }
  
  _generateButtonComponent(prompt) {
    const isIcon = prompt.includes('icône') || prompt.includes('icon');
    const isLoading = prompt.includes('loading') || prompt.includes('chargement');
    const color = this._extractColor(prompt) || 'blue';
    const size = this._extractSize(prompt) || 'md';
    
    return `<script>
  export let variant = 'primary';
  export let size = '${size}';
  export let disabled = false;
  export let loading = false;
  export let type = 'button';
  export let icon = '';

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  $: variantClasses = {
    primary: 'bg-${color}-600 hover:bg-${color}-700 text-white focus:ring-${color}-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
    outline: 'border border-${color}-600 text-${color}-600 hover:bg-${color}-50 focus:ring-${color}-500',
    ghost: 'text-${color}-600 hover:bg-${color}-50 focus:ring-${color}-500'
  };
  
  $: sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  $: classes = \`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]}\`;
</script>

<button 
  {type}
  class={classes}
  {disabled}
  on:click
  on:focus
  on:blur
  aria-label={$$props['aria-label']}
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {:else if icon}
    <i class="{icon} mr-2"></i>
  ${isIcon ? '{:else}\n    <i class="fas fa-star mr-2"></i>' : ''}
  {/if}
  <slot>Bouton</slot>
</button>`;
  }
  
  _generateCardComponent(prompt) {
    const hasImage = prompt.includes('image') || prompt.includes('photo');
    const hasPrice = prompt.includes('prix') || prompt.includes('price') || prompt.includes('produit');
    
    return `<script>
  export let title = '';
  export let subtitle = '';
  export let image = '';
  export let price = '';
  export let badge = '';
  export let href = '';
</script>

<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
  ${hasImage ? `{#if image}
    <div class="relative">
      <img src={image} alt={title} class="w-full h-48 object-cover">
      {#if badge}
        <span class="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          {badge}
        </span>
      {/if}
    </div>
  {/if}` : ''}
  
  <div class="p-6">
    {#if title}
      <h3 class="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    {/if}
    
    {#if subtitle}
      <p class="text-gray-600 text-sm mb-4">{subtitle}</p>
    {/if}
    
    <div class="space-y-4">
      <slot></slot>
    </div>
    
    <div class="flex items-center justify-between mt-6">
      ${hasPrice ? `{#if price}
        <div class="text-2xl font-bold text-green-600">{price}</div>
      {/if}` : ''}
      
      <slot name="actions">
        {#if href}
          <a {href} class="text-blue-600 hover:text-blue-800 font-medium">
            En savoir plus →
          </a>
        {/if}
      </slot>
    </div>
  </div>
  
  <slot name="footer"></slot>
</div>`;
  }
  
  _generateInputComponent(prompt) {
    const hasValidation = prompt.includes('validation') || prompt.includes('erreur');
    const inputType = this._extractInputType(prompt);
    
    return `<script>
  export let label = '';
  export let placeholder = '';
  export let value = '';
  export let type = '${inputType}';
  export let required = false;
  export let disabled = false;
  export let error = '';
  export let help = '';
  export let id = '';
  
  $: inputId = id || \`input-\${Math.random().toString(36).substr(2, 9)}\`;
  
  const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors';
  $: classes = error 
    ? \`\${baseClasses} border-red-300 focus:ring-red-500 focus:border-red-500\`
    : \`\${baseClasses} border-gray-300 focus:ring-blue-500 focus:border-blue-500\`;
</script>

<div class="w-full">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}<span class="text-red-500 ml-1">*</span>{/if}
    </label>
  {/if}
  
  ${inputType === 'textarea' ? `<textarea
    id={inputId}
    class={classes}
    {placeholder}
    bind:value
    {required}
    {disabled}
    rows="4"
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps}
  ></textarea>` : `<input
    {type}
    id={inputId}
    class={classes}
    {placeholder}
    bind:value
    {required}
    {disabled}
    on:input
    on:change
    on:focus
    on:blur
    {...$$restProps}
  />`}
  
  ${hasValidation ? `{#if error}
    <p class="mt-1 text-sm text-red-600 flex items-center">
      <i class="fas fa-exclamation-circle mr-1"></i>
      {error}
    </p>
  {/if}` : ''}
  
  {#if help && !error}
    <p class="mt-1 text-sm text-gray-500">{help}</p>
  {/if}
</div>`;
  }
  
  _generateModalComponent(prompt) {
    const size = this._extractSize(prompt) || 'lg';
    
    return `<script>
  export let open = false;
  export let title = '';
  export let size = '${size}';
  export let closable = true;
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  function handleBackdrop(e) {
    if (e.target === e.currentTarget && closable) {
      close();
    }
  }
  
  function close() {
    open = false;
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape' && closable) {
      close();
    }
  }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={handleBackdrop}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    tabindex="-1"
  >
    <div class="bg-white rounded-lg w-full {sizes[size]} max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {#if title || closable}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          {#if title}
            <h2 id="modal-title" class="text-xl font-semibold text-gray-900">{title}</h2>
          {:else}
            <div></div>
          {/if}
          
          {#if closable}
            <button 
              class="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
              on:click={close}
              aria-label="Fermer la modal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        <slot></slot>
      </div>
      
      <slot name="footer"></slot>
    </div>
  </div>
{/if}`;
  }
  
  _generateNavigationComponent(prompt) {
    return `<script>
  export let brand = 'Brand';
  export let items = [];
  export let currentPath = '';
  
  let mobileMenuOpen = false;
  
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<nav class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <!-- Logo/Brand -->
      <div class="flex items-center">
        <div class="flex-shrink-0 flex items-center">
          <span class="text-xl font-bold text-gray-900">{brand}</span>
        </div>
      </div>
      
      <!-- Desktop Menu -->
      <div class="hidden md:flex items-center space-x-8">
        {#each items as item}
          <a 
            href={item.href} 
            class="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors {currentPath === item.href ? 'text-blue-600 border-b-2 border-blue-600' : ''}"
          >
            {#if item.icon}
              <i class="{item.icon} mr-1"></i>
            {/if}
            {item.label}
          </a>
        {/each}
        
        <slot name="actions"></slot>
      </div>
      
      <!-- Mobile menu button -->
      <div class="md:hidden flex items-center">
        <button
          on:click={toggleMobileMenu}
          class="text-gray-700 hover:text-blue-600 p-2"
          aria-label="Menu mobile"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {#if mobileMenuOpen}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            {/if}
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden border-t border-gray-200 bg-white">
      <div class="px-2 pt-2 pb-3 space-y-1">
        {#each items as item}
          <a 
            href={item.href}
            class="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md {currentPath === item.href ? 'text-blue-600 bg-blue-50' : ''}"
            on:click={() => mobileMenuOpen = false}
          >
            {#if item.icon}
              <i class="{item.icon} mr-2"></i>
            {/if}
            {item.label}
          </a>
        {/each}
      </div>
      
      <div class="px-4 py-3 border-t border-gray-200">
        <slot name="mobile-actions"></slot>
      </div>
    </div>
  {/if}
</nav>`;
  }
  
  _generateGenericComponent(prompt) {
    return `<script>
  // Composant généré pour: ${prompt}
  export let title = '';
  export let variant = 'default';
</script>

<div class="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
  {#if title}
    <h3 class="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
  {/if}
  
  <div class="space-y-3">
    <p class="text-gray-600">Composant généré pour: <em>"${prompt}"</em></p>
    <slot></slot>
  </div>
</div>`;
  }
  
  _extractColor(prompt) {
    if (prompt.includes('bleu') || prompt.includes('blue')) return 'blue';
    if (prompt.includes('vert') || prompt.includes('green')) return 'green';
    if (prompt.includes('rouge') || prompt.includes('red')) return 'red';
    if (prompt.includes('jaune') || prompt.includes('yellow')) return 'yellow';
    if (prompt.includes('violet') || prompt.includes('purple')) return 'purple';
    return null;
  }
  
  _extractSize(prompt) {
    if (prompt.includes('petit') || prompt.includes('small')) return 'sm';
    if (prompt.includes('grand') || prompt.includes('large')) return 'lg';
    if (prompt.includes('énorme') || prompt.includes('xl')) return 'xl';
    return 'md';
  }
  
  _extractInputType(prompt) {
    if (prompt.includes('email')) return 'email';
    if (prompt.includes('password') || prompt.includes('mot de passe')) return 'password';
    if (prompt.includes('nombre') || prompt.includes('number')) return 'number';
    if (prompt.includes('date')) return 'date';
    if (prompt.includes('textarea') || prompt.includes('zone de texte') || prompt.includes('message')) return 'textarea';
    return 'text';
  }

  _validateAndCleanCode(code) {
    // Validation basique du code Svelte
    if (!code.includes('<script>') && !code.includes('<')) {
      throw new Error('Code généré invalide');
    }
    
    // Nettoyer et formater
    return code.trim();
  }

  async _saveToDatabase(description, type, code, options) {
    try {
      // Utiliser la table components existante plutôt que generated_components
      const { data, error } = await supabase
        .from('components')
        .insert({
          name: `Generated ${type} - ${Date.now()}`,
          type: type,
          category: 'ai-generated',
          description: description,
          code: code,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.warn('Erreur sauvegarde base:', error);
      // Non bloquant
    }
  }

  _getFallbackComponent(type) {
    const fallbacks = {
      button: '<button class="px-4 py-2 bg-blue-500 text-white rounded"><slot>Button</slot></button>',
      input: '<input class="border border-gray-300 rounded px-3 py-2" />',
      card: '<div class="border border-gray-200 rounded p-4"><slot></slot></div>',
      modal: '<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div class="bg-white rounded p-6"><slot></slot></div></div>'
    };
    
    return fallbacks[type] || '<div><slot></slot></div>';
  }

  /**
   * Charge les composants depuis la base de données
   */
  async loadFromDatabase() {
    await this.init();
    
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('category', 'ai-generated')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur chargement composants:', error);
      return [];
    }
  }

  /**
   * Nettoie le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Instance singleton
export const componentGenerator = new ComponentGenerator();
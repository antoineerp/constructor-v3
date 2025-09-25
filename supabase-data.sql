-- Constructor V3 - Données d'initialisation
-- Exécutez ce script APRÈS le schéma principal

-- Insérer les templates par défaut
INSERT INTO templates (name, type, description, structure) VALUES
(
  'Site E-commerce Modern',
  'e-commerce',
  'Template complet pour boutique en ligne avec panier et paiement',
  '{
    "routes": [
      {"path": "/", "component": "Home", "description": "Page d''accueil avec produits vedettes"},
      {"path": "/products", "component": "ProductList", "description": "Liste des produits avec filtres"},
      {"path": "/product/[id]", "component": "ProductDetail", "description": "Détail d''un produit"},
      {"path": "/cart", "component": "Cart", "description": "Panier d''achat"},
      {"path": "/checkout", "component": "Checkout", "description": "Processus de commande"}
    ],
    "components": ["Header", "ProductCard", "CartButton", "SearchBar", "Footer"],
    "features": ["authentification", "panier", "paiement", "recherche", "filtres"]
  }'
),
(
  'Dashboard CRM',
  'crm',
  'Interface de gestion de la relation client avec tableaux de bord',
  '{
    "routes": [
      {"path": "/", "component": "Dashboard", "description": "Vue d''ensemble avec métriques"},
      {"path": "/contacts", "component": "ContactList", "description": "Gestion des contacts"},
      {"path": "/deals", "component": "DealPipeline", "description": "Pipeline des ventes"},
      {"path": "/reports", "component": "Reports", "description": "Rapports et analyses"}
    ],
    "components": ["Sidebar", "StatsCard", "DataTable", "Charts", "Modal"],
    "features": ["authentification", "graphiques", "export", "notifications"]
  }'
),
(
  'Blog Personnel',
  'blog',
  'Blog moderne avec gestion des articles et commentaires',
  '{
    "routes": [
      {"path": "/", "component": "Home", "description": "Accueil avec articles récents"},
      {"path": "/blog", "component": "BlogList", "description": "Liste des articles"},
      {"path": "/blog/[slug]", "component": "BlogPost", "description": "Article complet"},
      {"path": "/about", "component": "About", "description": "À propos de l''auteur"}
    ],
    "components": ["Header", "ArticleCard", "CommentSection", "TagsList", "SearchBox"],
    "features": ["markdown", "commentaires", "tags", "recherche", "rss"]
  }'
),
(
  'Portfolio Créatif',
  'portfolio',
  'Site portfolio pour artistes et créatifs avec galerie',
  '{
    "routes": [
      {"path": "/", "component": "Home", "description": "Accueil avec présentation"},
      {"path": "/portfolio", "component": "Gallery", "description": "Galerie de projets"},
      {"path": "/project/[id]", "component": "ProjectDetail", "description": "Détail d''un projet"},
      {"path": "/contact", "component": "Contact", "description": "Formulaire de contact"}
    ],
    "components": ["Hero", "ProjectCard", "ImageGallery", "ContactForm", "Timeline"],
    "features": ["galerie", "lightbox", "animations", "contact", "responsive"]
  }'
),
(
  'Landing Page',
  'landing-page',
  'Page d''atterrissage optimisée pour la conversion',
  '{
    "routes": [
      {"path": "/", "component": "Landing", "description": "Page unique avec sections"}
    ],
    "components": ["Hero", "Features", "Testimonials", "Pricing", "CallToAction"],
    "features": ["scroll-spy", "animations", "forms", "analytics", "seo"]
  }'
),
(
  'App Dashboard',
  'dashboard',
  'Interface d''administration avec widgets et graphiques',
  '{
    "routes": [
      {"path": "/", "component": "Overview", "description": "Vue d''ensemble"},
      {"path": "/analytics", "component": "Analytics", "description": "Analyses détaillées"},
      {"path": "/users", "component": "UserManagement", "description": "Gestion des utilisateurs"},
      {"path": "/settings", "component": "Settings", "description": "Paramètres"}
    ],
    "components": ["Sidebar", "Widget", "Chart", "DataTable", "UserCard"],
    "features": ["graphiques", "temps-réel", "export", "permissions", "notifications"]
  }'
);

-- Insérer les composants par défaut
INSERT INTO components (name, type, category, code, props) VALUES
(
  'Button Modern',
  'button',
  'ui',
  '<script lang="ts">
  export let variant: "primary" | "secondary" | "danger" = "primary";
  export let size: "sm" | "md" | "lg" = "md";
  export let disabled = false;
  export let loading = false;
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    danger: "bg-red-600 hover:bg-red-700 text-white"
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
</script>

<button 
  class="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed {variants[variant]} {sizes[size]}"
  {disabled}
  on:click
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  <slot />
</button>',
  '{"variant": {"type": "string", "default": "primary"}, "size": {"type": "string", "default": "md"}, "disabled": {"type": "boolean", "default": false}, "loading": {"type": "boolean", "default": false}}'
),
(
  'Card Elegant',
  'card',
  'ui',
  '<script lang="ts">
  export let title = "";
  export let subtitle = "";
  export let padding = "p-6";
  export let shadow = "shadow-lg";
</script>

<div class="bg-white rounded-xl {shadow} {padding} border border-gray-100">
  {#if title}
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
      {#if subtitle}
        <p class="text-sm text-gray-600 mt-1">{subtitle}</p>
      {/if}
    </div>
  {/if}
  
  <div class="space-y-4">
    <slot />
  </div>
</div>',
  '{"title": {"type": "string", "default": ""}, "subtitle": {"type": "string", "default": ""}, "padding": {"type": "string", "default": "p-6"}, "shadow": {"type": "string", "default": "shadow-lg"}}'
),
(
  'Header Navigation',
  'header',
  'navigation',
  '<script lang="ts">
  import { Button } from "$lib/components/ui";
  
  export let logo = "Constructor V3";
  export let navigation = [
    { label: "Accueil", href: "/" },
    { label: "Projets", href: "/projects" },
    { label: "Templates", href: "/templates" }
  ];
  
  let mobileMenuOpen = false;
</script>

<nav class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo -->
      <div class="flex-shrink-0 flex items-center">
        <a href="/" class="text-xl font-bold text-gray-900">{logo}</a>
      </div>
      
      <!-- Navigation desktop -->
      <div class="hidden md:block">
        <div class="ml-10 flex items-baseline space-x-4">
          {#each navigation as item}
            <a href={item.href} class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
              {item.label}
            </a>
          {/each}
        </div>
      </div>
      
      <!-- Actions -->
      <div class="hidden md:flex items-center space-x-4">
        <Button variant="secondary" size="sm">Se connecter</Button>
        <Button size="sm">Commencer</Button>
      </div>
      
      <!-- Mobile menu button -->
      <div class="md:hidden">
        <button 
          type="button" 
          class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:click={() => mobileMenuOpen = !mobileMenuOpen}
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Mobile menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t">
        {#each navigation as item}
          <a href={item.href} class="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium">
            {item.label}
          </a>
        {/each}
        <div class="pt-4 pb-3 border-t border-gray-200">
          <div class="flex flex-col space-y-2 px-3">
            <Button variant="secondary" size="sm">Se connecter</Button>
            <Button size="sm">Commencer</Button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</nav>',
  '{"logo": {"type": "string", "default": "Constructor V3"}, "navigation": {"type": "array", "default": []}}'
),
(
  'Input Modern',
  'input',
  'form',
  '<script lang="ts">
  export let type = "text";
  export let placeholder = "";
  export let label = "";
  export let value = "";
  export let error = "";
  export let required = false;
  export let disabled = false;
  
  let focused = false;
</script>

<div class="w-full">
  {#if label}
    <label class="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {#if required}<span class="text-red-500">*</span>{/if}
    </label>
  {/if}
  
  <div class="relative">
    <input 
      {type}
      {placeholder}
      bind:value
      {disabled}
      {required}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed {error ? ''ring-2 ring-red-500 border-red-500'' : ''''} transition-colors"
      on:focus={() => focused = true}
      on:blur={() => focused = false}
      on:input
      on:change
    />
    
    {#if error}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
    {/if}
  </div>
  
  {#if error}
    <p class="mt-1 text-sm text-red-600">{error}</p>
  {/if}
</div>',
  '{"type": {"type": "string", "default": "text"}, "placeholder": {"type": "string", "default": ""}, "label": {"type": "string", "default": ""}, "error": {"type": "string", "default": ""}, "required": {"type": "boolean", "default": false}, "disabled": {"type": "boolean", "default": false}}'
),
(
  'Modal Premium',
  'modal',
  'ui',
  '<script lang="ts">
  import { createEventDispatcher } from "svelte";
  
  export let open = false;
  export let title = "";
  export let size: "sm" | "md" | "lg" | "xl" = "md";
  export let closeOnOverlay = true;
  
  const dispatch = createEventDispatcher();
  
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl"
  };
  
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget && closeOnOverlay) {
      close();
    }
  }
  
  function close() {
    open = false;
    dispatch("close");
  }
  
  function handleKeydown(e) {
    if (e.key === "Escape" && open) {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
    on:click={handleOverlayClick}
  >
    <div class="bg-white rounded-xl shadow-xl {sizes[size]} w-full transform transition-all">
      {#if title}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            type="button"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            on:click={close}
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
{/if}',
  '{"open": {"type": "boolean", "default": false}, "title": {"type": "string", "default": ""}, "size": {"type": "string", "default": "md"}, "closeOnOverlay": {"type": "boolean", "default": true}}'
);

-- Insérer quelques prompts d'exemple
INSERT INTO prompts (name, description, template_id, components) VALUES
(
  'Boutique de vêtements moderne',
  'Site e-commerce pour une boutique de mode avec panier et paiement intégré',
  1,
  '[1, 3, 4]'
),
(
  'Dashboard de vente',
  'Interface CRM pour suivre les ventes et gérer les clients',
  2,
  '[1, 2, 5]'
),
(
  'Blog tech personnel',
  'Blog personnel pour partager des articles sur la technologie',
  3,
  '[1, 2, 3, 4]'
);

-- Insérer des statistiques initiales
INSERT INTO usage_stats (date, total_prompts, total_projects) VALUES
(CURRENT_DATE - INTERVAL '7 days', 15, 8),
(CURRENT_DATE - INTERVAL '6 days', 22, 12),
(CURRENT_DATE - INTERVAL '5 days', 18, 9),
(CURRENT_DATE - INTERVAL '4 days', 25, 15),
(CURRENT_DATE - INTERVAL '3 days', 30, 18),
(CURRENT_DATE - INTERVAL '2 days', 28, 16),
(CURRENT_DATE - INTERVAL '1 day', 35, 22),
(CURRENT_DATE, 12, 7);
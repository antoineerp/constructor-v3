/**
 * Templates prédéfinis pour différents types de projets
 */

export const templates = {
  'e-commerce': {
    name: 'E-commerce Moderne',
    description: 'Template pour site e-commerce avec panier, paiement et gestion produits',
    structure: {
      routes: [
        { path: '/', component: 'HomePage' },
        { path: '/products', component: 'ProductsPage' },
        { path: '/products/[id]', component: 'ProductDetailPage' },
        { path: '/cart', component: 'CartPage' },
        { path: '/checkout', component: 'CheckoutPage' },
        { path: '/profile', component: 'ProfilePage' }
      ],
      components: [
        'Header.svelte',
        'Footer.svelte',
        'ProductCard.svelte',
        'ProductGrid.svelte',
        'Cart.svelte',
        'AddToCart.svelte',
        'SearchBar.svelte',
        'CategoryFilter.svelte'
      ],
      stores: [
        'cart.js',
        'products.js',
        'auth.js',
        'ui.js'
      ]
    },
    defaultCode: {
      routes: {
        '+page.svelte': `<script>
  import { onMount } from 'svelte';
  import ProductGrid from '$lib/components/ProductGrid.svelte';
  import Header from '$lib/components/Header.svelte';
  
  let products = [];
  let loading = true;

  onMount(async () => {
    // Simuler le chargement des produits
    setTimeout(() => {
      products = [
        { id: 1, name: 'Produit 1', price: 29.99, image: '/placeholder.jpg' },
        { id: 2, name: 'Produit 2', price: 49.99, image: '/placeholder.jpg' },
        { id: 3, name: 'Produit 3', price: 19.99, image: '/placeholder.jpg' }
      ];
      loading = false;
    }, 1000);
  });
</script>

<Header />

<main class="container mx-auto px-4 py-8">
  <section class="hero mb-12">
    <h1 class="text-4xl font-bold text-center mb-4">Bienvenue sur notre boutique</h1>
    <p class="text-xl text-center text-gray-600">Découvrez nos produits exceptionnels</p>
  </section>

  {#if loading}
    <div class="flex justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else}
    <ProductGrid {products} />
  {/if}
</main>`,
        
        'products/+page.svelte': `<script>
  import { page } from '$app/stores';
  import ProductGrid from '$lib/components/ProductGrid.svelte';
  import CategoryFilter from '$lib/components/CategoryFilter.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  
  let products = [];
  let filteredProducts = [];
  let selectedCategory = 'all';
  let searchQuery = '';

  // Logic pour filtrer les produits
  $: {
    filteredProducts = products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }
</script>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Nos Produits</h1>
  
  <div class="flex flex-col md:flex-row gap-6 mb-8">
    <CategoryFilter bind:selected={selectedCategory} />
    <SearchBar bind:value={searchQuery} />
  </div>

  <ProductGrid products={filteredProducts} />
</div>`
      }
    }
  },

  'crm': {
    name: 'CRM Professionnel',
    description: 'Template pour application CRM avec gestion clients, leads et tableau de bord',
    structure: {
      routes: [
        { path: '/', component: 'DashboardPage' },
        { path: '/clients', component: 'ClientsPage' },
        { path: '/clients/[id]', component: 'ClientDetailPage' },
        { path: '/leads', component: 'LeadsPage' },
        { path: '/reports', component: 'ReportsPage' },
        { path: '/settings', component: 'SettingsPage' }
      ],
      components: [
        'Sidebar.svelte',
        'ClientCard.svelte',
        'LeadCard.svelte',
        'StatsCard.svelte',
        'DataTable.svelte',
        'Chart.svelte'
      ],
      stores: [
        'clients.js',
        'leads.js',
        'dashboard.js',
        'auth.js'
      ]
    }
  },

  'blog': {
    name: 'Blog Personnel',
    description: 'Template pour blog avec articles, catégories et commentaires',
    structure: {
      routes: [
        { path: '/', component: 'HomePage' },
        { path: '/articles', component: 'ArticlesPage' },
        { path: '/articles/[slug]', component: 'ArticlePage' },
        { path: '/categories', component: 'CategoriesPage' },
        { path: '/about', component: 'AboutPage' }
      ],
      components: [
        'Header.svelte',
        'Footer.svelte',
        'ArticleCard.svelte',
        'ArticleList.svelte',
        'CategoryTag.svelte',
        'CommentSection.svelte'
      ],
      stores: [
        'articles.js',
        'categories.js',
        'ui.js'
      ]
    }
  },

  'portfolio': {
    name: 'Portfolio Créatif',
    description: 'Template pour portfolio avec projets, compétences et contact',
    structure: {
      routes: [
        { path: '/', component: 'HomePage' },
        { path: '/projects', component: 'ProjectsPage' },
        { path: '/projects/[id]', component: 'ProjectPage' },
        { path: '/about', component: 'AboutPage' },
        { path: '/contact', component: 'ContactPage' }
      ],
      components: [
        'Hero.svelte',
        'ProjectCard.svelte',
        'ProjectGrid.svelte',
        'SkillsSection.svelte',
        'ContactForm.svelte',
        'Navigation.svelte'
      ],
      stores: [
        'projects.js',
        'ui.js'
      ]
    }
  },

  'dashboard': {
    name: 'Dashboard Admin',
    description: 'Template pour tableau de bord administrateur avec métriques et gestion',
    structure: {
      routes: [
        { path: '/', component: 'DashboardPage' },
        { path: '/users', component: 'UsersPage' },
        { path: '/analytics', component: 'AnalyticsPage' },
        { path: '/settings', component: 'SettingsPage' }
      ],
      components: [
        'Sidebar.svelte',
        'MetricCard.svelte',
        'Chart.svelte',
        'DataTable.svelte',
        'UserCard.svelte'
      ],
      stores: [
        'dashboard.js',
        'users.js',
        'analytics.js'
      ]
    }
  },

  'landing': {
    name: 'Landing Page',
    description: 'Template pour page de destination avec sections optimisées pour la conversion',
    structure: {
      routes: [
        { path: '/', component: 'LandingPage' }
      ],
      components: [
        'Hero.svelte',
        'Features.svelte',
        'Testimonials.svelte',
        'Pricing.svelte',
        'CTA.svelte',
        'Footer.svelte'
      ],
      stores: [
        'ui.js'
      ]
    }
  }
};

/**
 * Obtient un template par son type
 */
export function getTemplate(type) {
  return templates[type] || null;
}

/**
 * Obtient tous les templates disponibles
 */
export function getAllTemplates() {
  return Object.keys(templates).map(type => ({
    type,
    ...templates[type]
  }));
}

/**
 * Trouve les templates les plus appropriés pour un prompt
 */
export function findMatchingTemplates(projectType, features = []) {
  const matches = [];

  for (const [type, template] of Object.entries(templates)) {
    let score = 0;

    // Score basé sur le type de projet
    if (type === projectType) {
      score += 1.0;
    } else {
      // Score partiel pour types similaires
      const similarity = calculateTypeSimilarity(type, projectType);
      score += similarity * 0.5;
    }

    // Score basé sur les fonctionnalités
    const featureMatch = calculateFeatureMatch(template, features);
    score += featureMatch * 0.3;

    if (score > 0.1) {
      matches.push({
        type,
        template,
        score: Math.min(score, 1.0),
        reason: generateMatchReason(type, projectType, features)
      });
    }
  }

  // Trier par score décroissant
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Calcule la similarité entre deux types de projets
 */
function calculateTypeSimilarity(type1, type2) {
  const similarities = {
    'e-commerce': ['dashboard', 'crm'],
    'crm': ['dashboard', 'e-commerce'],
    'dashboard': ['crm', 'e-commerce'],
    'blog': ['portfolio'],
    'portfolio': ['blog', 'landing'],
    'landing': ['portfolio']
  };

  const similar = similarities[type1] || [];
  return similar.includes(type2) ? 0.6 : 0;
}

/**
 * Calcule la correspondance entre un template et des fonctionnalités
 */
function calculateFeatureMatch(template, features) {
  if (!features.length) return 0;

  const templateFeatures = extractTemplateFeatures(template);
  const matches = features.filter(feature => 
    templateFeatures.some(tf => tf.includes(feature) || feature.includes(tf))
  );

  return matches.length / features.length;
}

/**
 * Extrait les fonctionnalités d'un template
 */
function extractTemplateFeatures(template) {
  const features = [];
  
  // Extraire des routes
  template.structure.routes.forEach(route => {
    features.push(route.path.split('/')[1] || 'home');
  });

  // Extraire des composants
  template.structure.components.forEach(component => {
    features.push(component.toLowerCase().replace('.svelte', ''));
  });

  return features;
}

/**
 * Génère une raison pour la correspondance d'un template
 */
function generateMatchReason(templateType, projectType, features) {
  if (templateType === projectType) {
    return `Correspondance parfaite pour un projet ${projectType}`;
  }

  const reasons = [];
  
  if (calculateTypeSimilarity(templateType, projectType) > 0) {
    reasons.push(`Type similaire à ${projectType}`);
  }

  if (features.length > 0) {
    const template = templates[templateType];
    const matchingFeatures = features.filter(feature =>
      extractTemplateFeatures(template).some(tf => tf.includes(feature))
    );
    
    if (matchingFeatures.length > 0) {
      reasons.push(`Inclut: ${matchingFeatures.slice(0, 3).join(', ')}`);
    }
  }

  return reasons.join(' - ') || `Template ${templateType} disponible`;
}
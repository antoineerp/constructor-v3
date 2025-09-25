#!/bin/bash

# Script d'initialisation des templates par défaut dans Supabase

echo "🚀 Initialisation des templates par défaut..."

# Vérifier que les variables d'environnement sont définies
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Erreur: Variables SUPABASE_URL et SUPABASE_ANON_KEY requises"
    exit 1
fi

# Templates par défaut à insérer
templates='[
  {
    "name": "E-commerce Moderne",
    "type": "e-commerce",
    "structure": {
      "routes": [
        {"path": "/", "component": "HomePage"},
        {"path": "/products", "component": "ProductsPage"},
        {"path": "/products/[id]", "component": "ProductDetailPage"},
        {"path": "/cart", "component": "CartPage"},
        {"path": "/checkout", "component": "CheckoutPage"}
      ],
      "components": ["Header.svelte", "ProductCard.svelte", "Cart.svelte"],
      "stores": ["cart.js", "products.js", "auth.js"]
    }
  },
  {
    "name": "CRM Professionnel", 
    "type": "crm",
    "structure": {
      "routes": [
        {"path": "/", "component": "DashboardPage"},
        {"path": "/clients", "component": "ClientsPage"},
        {"path": "/leads", "component": "LeadsPage"},
        {"path": "/reports", "component": "ReportsPage"}
      ],
      "components": ["Sidebar.svelte", "ClientCard.svelte", "StatsCard.svelte"],
      "stores": ["clients.js", "leads.js", "dashboard.js"]
    }
  },
  {
    "name": "Blog Personnel",
    "type": "blog", 
    "structure": {
      "routes": [
        {"path": "/", "component": "HomePage"},
        {"path": "/articles", "component": "ArticlesPage"},
        {"path": "/articles/[slug]", "component": "ArticlePage"},
        {"path": "/about", "component": "AboutPage"}
      ],
      "components": ["Header.svelte", "ArticleCard.svelte", "CommentSection.svelte"],
      "stores": ["articles.js", "categories.js"]
    }
  },
  {
    "name": "Portfolio Créatif",
    "type": "portfolio",
    "structure": {
      "routes": [
        {"path": "/", "component": "HomePage"},
        {"path": "/projects", "component": "ProjectsPage"}, 
        {"path": "/projects/[id]", "component": "ProjectPage"},
        {"path": "/contact", "component": "ContactPage"}
      ],
      "components": ["Hero.svelte", "ProjectCard.svelte", "ContactForm.svelte"],
      "stores": ["projects.js", "ui.js"]
    }
  },
  {
    "name": "Dashboard Admin",
    "type": "dashboard",
    "structure": {
      "routes": [
        {"path": "/", "component": "DashboardPage"},
        {"path": "/users", "component": "UsersPage"},
        {"path": "/analytics", "component": "AnalyticsPage"},
        {"path": "/settings", "component": "SettingsPage"}
      ],
      "components": ["Sidebar.svelte", "MetricCard.svelte", "Chart.svelte", "DataTable.svelte"],
      "stores": ["dashboard.js", "users.js", "analytics.js"]
    }
  },
  {
    "name": "Landing Page",
    "type": "landing",
    "structure": {
      "routes": [
        {"path": "/", "component": "LandingPage"}
      ],
      "components": ["Hero.svelte", "Features.svelte", "Testimonials.svelte", "Pricing.svelte", "CTA.svelte"],
      "stores": ["ui.js"]
    }
  }
]'

# Composants par défaut
components='[
  {
    "name": "Header",
    "type": "header",
    "category": "navigation",
    "code": "<header class=\"bg-white shadow-md\"><nav class=\"container mx-auto px-4 py-3\"><div class=\"flex items-center justify-between\"><div class=\"text-xl font-bold\">Logo</div><div class=\"space-x-4\"><a href=\"/\" class=\"hover:text-blue-600\">Accueil</a><a href=\"/products\" class=\"hover:text-blue-600\">Produits</a></div></div></nav></header>",
    "props": [{"name": "logo", "type": "string", "required": false, "default": "Logo"}],
    "dependencies": []
  },
  {
    "name": "Button",
    "type": "button", 
    "category": "ui",
    "code": "<script>export let variant = \"primary\"; export let size = \"md\"; export let disabled = false;</script><button class=\"btn btn-{variant} btn-{size}\" {disabled} on:click><slot /></button>",
    "props": [
      {"name": "variant", "type": "string", "required": false, "default": "primary"},
      {"name": "size", "type": "string", "required": false, "default": "md"},
      {"name": "disabled", "type": "boolean", "required": false, "default": false}
    ],
    "dependencies": []
  },
  {
    "name": "Card",
    "type": "card",
    "category": "ui", 
    "code": "<div class=\"bg-white rounded-lg shadow-md p-6\"><slot /></div>",
    "props": [],
    "dependencies": []
  },
  {
    "name": "ProductCard",
    "type": "card",
    "category": "ui",
    "code": "<script>export let product;</script><div class=\"bg-white rounded-lg shadow-md overflow-hidden\"><img src={product.image} alt={product.name} class=\"w-full h-48 object-cover\"><div class=\"p-4\"><h3 class=\"font-semibold text-lg\">{product.name}</h3><p class=\"text-gray-600 mb-2\">{product.description}</p><div class=\"flex items-center justify-between\"><span class=\"text-xl font-bold text-blue-600\">${product.price}</span><button class=\"bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded\">Ajouter au panier</button></div></div></div>",
    "props": [{"name": "product", "type": "object", "required": true}],
    "dependencies": []
  },
  {
    "name": "Modal",
    "type": "modal",
    "category": "ui",
    "code": "<script>export let open = false; function close() { open = false; }</script>{#if open}<div class=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50\" on:click={close}><div class=\"bg-white rounded-lg p-6 max-w-md w-full mx-4\" on:click|stopPropagation><slot /></div></div>{/if}",
    "props": [{"name": "open", "type": "boolean", "required": false, "default": false}],
    "dependencies": []
  }
]'

# Prompts par défaut  
prompts='[
  {
    "name": "Site e-commerce vêtements",
    "description": "Boutique en ligne pour vendre des vêtements avec panier et paiement",
    "template_id": null,
    "components": [1, 4, 2]
  },
  {
    "name": "CRM gestion clients",
    "description": "Application de gestion de la relation client avec tableau de bord",
    "template_id": null, 
    "components": [1, 2, 3]
  },
  {
    "name": "Blog personnel tech",
    "description": "Blog personnel pour partager des articles techniques",
    "template_id": null,
    "components": [1, 2, 3]
  },
  {
    "name": "Portfolio designer",
    "description": "Portfolio créatif pour présenter des projets de design",
    "template_id": null,
    "components": [1, 3, 5]
  }
]'

echo "📝 Insertion des templates..."
for template in $(echo $templates | jq -r '.[] | @base64'); do
    data=$(echo $template | base64 --decode)
    curl -X POST \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$SUPABASE_URL/rest/v1/templates"
done

echo "🧩 Insertion des composants..."
for component in $(echo $components | jq -r '.[] | @base64'); do
    data=$(echo $component | base64 --decode)
    curl -X POST \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$SUPABASE_URL/rest/v1/components"
done

echo "💭 Insertion des prompts..."
for prompt in $(echo $prompts | jq -r '.[] | @base64'); do
    data=$(echo $prompt | base64 --decode)
    curl -X POST \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$SUPABASE_URL/rest/v1/prompts"
done

echo "✅ Initialisation terminée!"
echo ""
echo "🔗 Templates créés: 6"
echo "🧩 Composants créés: 5" 
echo "💭 Prompts créés: 4"
echo ""
echo "Vous pouvez maintenant utiliser l'application Constructor V3!"
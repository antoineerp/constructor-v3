import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';

// Endpoint pour l'enrichissement intelligent de prompts (style bolt.new)
export async function POST({ request }) {
  try {
    const { prompt, context, provider = 'openai' } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return json({ success: false, error: 'Prompt requis' }, { status: 400 });
    }

    // Utiliser le système d'expansion d'intention existant
    let intentExpansion = null;
    try {
      intentExpansion = await openaiService.generateIntentExpansion(prompt, { provider });
    } catch (e) {
      console.warn('Intent expansion failed:', e.message);
    }

    // Construire un prompt enrichi contextuel
    let enrichedPrompt = prompt;
    
    if (intentExpansion?.enriched_query) {
      enrichedPrompt = intentExpansion.enriched_query;
    }

    // Ajouter contexte technique selon le type détecté
    if (context) {
      const { detectedType, domain, complexity, techLevel } = context;
      
      // Ajouts spécifiques selon domaine
      const domainSpecs = {
        business: {
          features: ['gestion clients', 'pipeline vente', 'reporting KPI', 'tableau de bord'],
          tech: ['authentification', 'CRUD complet', 'filtres avancés', 'exports']
        },
        content: {
          features: ['système publication', 'catégories/tags', 'SEO meta', 'édition WYSIWYG'],
          tech: ['markdown support', 'recherche full-text', 'pagination', 'cache optimisé']
        },
        ecommerce: {
          features: ['catalogue produits', 'panier', 'checkout', 'gestion commandes'],
          tech: ['calculs TVA', 'gestion stock', 'modes paiement', 'facture PDF']
        },
        admin: {
          features: ['dashboard metrics', 'tables données', 'permissions', 'logs audit'],
          tech: ['graphiques temps réel', 'exports CSV/Excel', 'filtres complexes', 'pagination']
        },
        finance: {
          features: ['comptabilité', 'factures', 'devis', 'rapports financiers'],
          tech: ['calculs précis', 'conformité', 'archivage', 'intégrations bancaires']
        }
      };

      const spec = domainSpecs[domain];
      if (spec && detectedType === 'app') {
        enrichedPrompt += `\n\n## Spécifications ${domain.toUpperCase()}:`;
        enrichedPrompt += `\n### Fonctionnalités principales:`;
        enrichedPrompt += spec.features.map(f => `\n- ${f}`).join('');
        
        if (complexity === 'advanced') {
          enrichedPrompt += `\n### Aspects techniques:`;
          enrichedPrompt += spec.tech.map(t => `\n- ${t}`).join('');
        }
      }
    }

    // Ajouter contraintes techniques selon niveau
    if (context?.techLevel === 'technical') {
      enrichedPrompt += `\n\n## Contraintes techniques:`;
      enrichedPrompt += `\n- Architecture modulaire avec composants réutilisables`;
      enrichedPrompt += `\n- Gestion d'état appropriée (stores Svelte)`;
      enrichedPrompt += `\n- API endpoints RESTful bien structurés`;
      enrichedPrompt += `\n- Validation côté client et serveur`;
    } else if (context?.techLevel === 'design') {
      enrichedPrompt += `\n\n## Contraintes UX/UI:`;
      enrichedPrompt += `\n- Interface responsive (mobile-first)`;
      enrichedPrompt += `\n- Accessibilité WCAG AA`;
      enrichedPrompt += `\n- Animations et transitions fluides`;
      enrichedPrompt += `\n- Design system cohérent`;
    }

    // Ajouter recommandations d'architecture
    if (context?.detectedType === 'app') {
      enrichedPrompt += `\n\n## Architecture recommandée:`;
      enrichedPrompt += `\n- Structure: src/routes (pages) + src/lib/components (réutilisables)`;
      enrichedPrompt += `\n- Style: Tailwind CSS avec palette cohérente`;
      enrichedPrompt += `\n- Data: Stores Svelte pour état global si nécessaire`;
      enrichedPrompt += `\n- Format: Fichiers Svelte valides avec <script>, markup, style`;
    }

    return json({
      success: true,
      originalPrompt: prompt,
      enrichedPrompt: enrichedPrompt,
      intentExpansion: intentExpansion,
      context: context,
      suggestions: {
        nextSteps: generateNextSteps(context),
        alternatives: generateAlternatives(prompt, context)
      }
    });

  } catch (error) {
    console.error('Erreur enrichissement prompt:', error);
    return json({
      success: false,
      error: error.message || 'Erreur lors de l\'enrichissement'
    }, { status: 500 });
  }
}

function generateNextSteps(context) {
  if (!context) return [];
  
  const { detectedType, domain, complexity } = context;
  
  if (detectedType === 'app') {
    const baseSteps = [
      'Générer l\'application complète',
      'Tester dans le sandbox',
      'Affiner les composants'
    ];
    
    if (complexity === 'advanced') {
      baseSteps.push('Ajouter authentification', 'Optimiser performances');
    }
    
    if (domain === 'business') {
      baseSteps.push('Configurer la base de données', 'Ajouter rapports');
    }
    
    return baseSteps;
  }
  
  return ['Générer le composant', 'Tester l\'intégration', 'Ajuster le style'];
}

function generateAlternatives(prompt, context) {
  if (!context) return [];
  
  const { detectedType, domain } = context;
  
  if (detectedType === 'app') {
    return [
      `Version MVP de: ${prompt}`,
      `${prompt} avec dashboard admin`,
      `${prompt} version mobile-first`
    ];
  }
  
  return [
    `Version simplifiée: ${prompt}`,
    `${prompt} avec animations`,
    `${prompt} style moderne`
  ];
}
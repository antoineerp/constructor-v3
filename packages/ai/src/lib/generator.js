import { openai } from './client.js';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Générateur de code SvelteKit basé sur l'IA
 */
export class SvelteKitGenerator {
  constructor() {
    this.model = openai;
  }

  /**
   * Génère du code SvelteKit basé sur un prompt utilisateur
   */
  async generateFromPrompt(userPrompt, templateType = null, components = []) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
Tu es un expert en développement SvelteKit. Ton rôle est de générer du code SvelteKit de haute qualité basé sur les demandes des utilisateurs.

## Prompt utilisateur
{userPrompt}

## Template de base
{templateInfo}

## Composants disponibles
{componentsInfo}

## Instructions
1. Analyse le prompt utilisateur pour comprendre les besoins
2. Sélectionne le template approprié si disponible
3. Génère le code SvelteKit suivant cette structure :
   - Routes (+page.svelte, +layout.svelte, etc.)
   - Composants réutilisables
   - Stores Svelte pour la gestion d'état
   - Styles avec Tailwind CSS

## Format de réponse
Réponds au format JSON avec cette structure :
\`\`\`json
{
  "analysis": "Analyse du prompt et explication de l'approche",
  "template_recommended": "Type de template recommandé",
  "components_needed": ["liste", "des", "composants"],
  "code": {
    "routes": {
      "+page.svelte": "code de la page principale",
      "+layout.svelte": "code du layout",
      "about/+page.svelte": "code des autres pages"
    },
    "components": {
      "Header.svelte": "code du composant header",
      "ProductCard.svelte": "code des autres composants"
    },
    "stores": {
      "app.js": "stores Svelte pour l'état global"
    },
    "styles": {
      "app.css": "styles CSS personnalisés"
    }
  },
  "suggestions": ["suggestions d'amélioration"]
}
\`\`\`

Génère maintenant le code SvelteKit :
    `);

    const templateInfo = templateType ? `Template de base : ${templateType}` : 'Aucun template spécifique';
    const componentsInfo = components.length > 0 ? components.map(c => `- ${c.name}: ${c.description || c.type}`).join('\n') : 'Aucun composant spécifique';

    const formattedPrompt = await template.format({
      userPrompt,
      templateInfo,
      componentsInfo
    });

    try {
      const response = await this.model.invoke(formattedPrompt);
      
      // Parse la réponse JSON
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          data: result
        };
      } else {
        // Fallback si pas de JSON trouvé
        return {
          success: false,
          error: 'Format de réponse invalide',
          raw_response: response
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Génère une itération basée sur un feedback utilisateur
   */
  async iterateCode(existingCode, userFeedback, originalPrompt) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
Tu es un expert en développement SvelteKit. L'utilisateur a un projet existant et souhaite y apporter des modifications.

## Prompt original
{originalPrompt}

## Code existant
{existingCode}

## Feedback utilisateur
{userFeedback}

## Instructions
1. Analyse le feedback utilisateur
2. Identifie les modifications nécessaires dans le code existant
3. Génère les modifications en gardant la cohérence avec le code existant

## Format de réponse
Réponds au format JSON avec cette structure :
\`\`\`json
{
  "analysis": "Analyse du feedback et modifications nécessaires",
  "changes": {
    "files_to_modify": {
      "chemin/fichier.svelte": "nouveau contenu complet du fichier"
    },
    "files_to_add": {
      "nouveau/fichier.svelte": "contenu du nouveau fichier"
    },
    "files_to_delete": ["fichiers", "à", "supprimer"]
  },
  "explanation": "Explication des modifications apportées"
}
\`\`\`

Génère maintenant les modifications :
    `);

    const formattedPrompt = await template.format({
      originalPrompt,
      existingCode: JSON.stringify(existingCode, null, 2),
      userFeedback
    });

    try {
      const response = await this.model.invoke(formattedPrompt);
      
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[1]);
        return {
          success: true,
          data: result
        };
      } else {
        return {
          success: false,
          error: 'Format de réponse invalide',
          raw_response: response
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggère des améliorations pour un projet
   */
  async suggestImprovements(code, projectType) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
Analyse ce code SvelteKit et suggère des améliorations.

## Code du projet
{code}

## Type de projet
{projectType}

## Instructions
Analyse le code et suggère des améliorations pour :
1. Performance
2. UX/UI
3. Accessibilité
4. SEO
5. Sécurité
6. Maintenabilité

Réponds au format JSON :
\`\`\`json
{
  "improvements": [
    {
      "category": "performance|ux|accessibility|seo|security|maintainability",
      "title": "Titre de l'amélioration",
      "description": "Description détaillée",
      "priority": "high|medium|low",
      "implementation": "Comment l'implémenter"
    }
  ]
}
\`\`\`
    `);

    const formattedPrompt = await template.format({
      code: JSON.stringify(code, null, 2),
      projectType
    });

    try {
      const response = await this.model.invoke(formattedPrompt);
      
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return {
          success: true,
          data: JSON.parse(jsonMatch[1])
        };
      } else {
        return {
          success: false,
          error: 'Format de réponse invalide'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
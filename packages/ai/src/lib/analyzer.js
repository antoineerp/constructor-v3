import { openai } from './client.js';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Analyseur de prompts et de feedback utilisateur
 */
export class PromptAnalyzer {
  constructor() {
    this.model = openai;
  }

  /**
   * Analyse un prompt utilisateur pour identifier le type de projet et les besoins
   */
  async analyzePrompt(userPrompt) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
Tu es un expert en analyse de besoins pour le développement web. Ton rôle est d'analyser les demandes des utilisateurs et d'identifier :
1. Le type d'application souhaité
2. Les fonctionnalités principales
3. Le style/design préféré
4. Les technologies nécessaires

## Prompt utilisateur
{userPrompt}

## Instructions
Analyse ce prompt et identifie :
- Le type d'application (e-commerce, CRM, blog, portfolio, etc.)
- Les fonctionnalités clés demandées
- Le style de design souhaité
- Les questions de clarification nécessaires

## Format de réponse
Réponds au format JSON strict :
\`\`\`json
{
  "project_type": "e-commerce|crm|blog|portfolio|dashboard|landing|saas|other",
  "confidence": 0.9,
  "key_features": ["authentification", "panier", "paiement"],
  "design_style": "moderne|minimaliste|coloré|professionnel|créatif|corporate",
  "technologies_needed": ["stripe", "auth", "database"],
  "clarification_questions": [
    "Voulez-vous inclure un système de recommandation ?",
    "Préférez-vous un design sombre ou clair ?"
  ],
  "template_suggestions": [
    {
      "name": "E-commerce Moderne",
      "match_score": 0.95,
      "reason": "Correspond parfaitement aux besoins e-commerce"
    }
  ]
}
\`\`\`

Analyse maintenant le prompt :
    `);

    const formattedPrompt = await template.format({ userPrompt });

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
   * Analyse le feedback utilisateur pour comprendre les modifications souhaitées
   */
  async analyzeFeedback(feedback, currentCode) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
L'utilisateur a fourni un feedback sur son projet. Analyse ce feedback pour comprendre quelles modifications il souhaite.

## Feedback utilisateur
{feedback}

## Code actuel (structure)
{codeStructure}

## Instructions
Analyse le feedback et identifie :
1. Les modifications demandées
2. Les fichiers affectés
3. Le type de changement (ajout, modification, suppression)
4. La complexité de l'implémentation

## Format de réponse
\`\`\`json
{
  "changes_requested": [
    {
      "type": "add|modify|delete|style|functionality",
      "target": "component|route|style|config",
      "description": "Description de la modification",
      "files_affected": ["src/routes/+page.svelte"],
      "complexity": "low|medium|high",
      "estimated_effort": "5 minutes|30 minutes|1 hour"
    }
  ],
  "clarification_needed": ["questions si le feedback n'est pas clair"],
  "suggestions": ["suggestions d'amélioration additionnelles"]
}
\`\`\`
    `);

    const codeStructure = this.extractCodeStructure(currentCode);
    const formattedPrompt = await template.format({ 
      feedback, 
      codeStructure: JSON.stringify(codeStructure, null, 2) 
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

  /**
   * Extrait la structure du code pour l'analyse
   */
  extractCodeStructure(code) {
    if (!code) return {};

    const structure = {
      routes: Object.keys(code.routes || {}),
      components: Object.keys(code.components || {}),
      stores: Object.keys(code.stores || {}),
      styles: Object.keys(code.styles || {})
    };

    return structure;
  }

  /**
   * Identifie les tendances dans les prompts pour améliorer les templates
   */
  async identifyTrends(prompts) {
    const template = PromptTemplate.fromTemplate(`
# Contexte
Analyse ces prompts d'utilisateurs pour identifier les tendances et besoins récurrents.

## Prompts à analyser
{prompts}

## Instructions
Identifie :
1. Les types d'applications les plus demandés
2. Les fonctionnalités récurrentes
3. Les styles de design populaires
4. Les manques dans les templates actuels

## Format de réponse
\`\`\`json
{
  "popular_project_types": [
    { "type": "e-commerce", "frequency": 15, "percentage": 30 }
  ],
  "popular_features": [
    { "feature": "authentification", "frequency": 25, "percentage": 50 }
  ],
  "design_trends": [
    { "style": "minimaliste", "frequency": 20, "percentage": 40 }
  ],
  "missing_templates": [
    { "type": "marketplace", "demand": "high", "reason": "Beaucoup de demandes mais pas de template" }
  ],
  "recommendations": [
    "Créer un template marketplace avec fonctionnalités multi-vendeurs"
  ]
}
\`\`\`
    `);

    const promptsText = prompts.map((p, i) => `${i + 1}. ${p.name || p.description}`).join('\n');
    const formattedPrompt = await template.format({ prompts: promptsText });

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
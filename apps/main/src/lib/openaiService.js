import { OPENAI_API_KEY } from '$env/static/private';

export class OpenAIService {
  constructor() {
    this.apiKey = OPENAI_API_KEY;
  }

  async generateComponent(prompt, type = 'generic') {
    if (!this.apiKey) {
      throw new Error('Clé API OpenAI manquante');
    }

    const systemPrompt = `Tu es un expert en développement Svelte. Génère UNIQUEMENT le code HTML/CSS du composant demandé, sans balises <script> ni imports. Le composant doit être responsive avec TailwindCSS et fonctionnel.

Règles importantes :
- Utilise uniquement du HTML avec des classes TailwindCSS
- Ne génère PAS de balises <script>, <style> ou imports
- Rends le composant interactif avec des événements on:click, on:input, etc.
- Assure-toi que le design soit moderne et responsive
- Utilise des icônes Font Awesome si nécessaire (fas fa-*)

Types de composants supportés :
- button: boutons avec hover states
- card: cartes avec titre, contenu et actions
- input: champs de formulaire avec labels
- modal: modales avec overlay
- navigation: menus de navigation
- generic: composants personnalisés`;

    const userPrompt = `Crée un composant ${type} : ${prompt}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur OpenAI: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const generatedCode = data.choices[0]?.message?.content?.trim();

      if (!generatedCode) {
        throw new Error('Aucun code généré par OpenAI');
      }

      // Nettoyer le code (enlever les balises markdown si présentes)
      let cleanCode = generatedCode
        .replace(/```html\n?/g, '')
        .replace(/```svelte\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return cleanCode;

    } catch (error) {
      console.error('Erreur OpenAI:', error);
      throw new Error(`Impossible de générer le composant: ${error.message}`);
    }
  }
}

export const openaiService = new OpenAIService();
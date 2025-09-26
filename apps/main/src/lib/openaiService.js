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

  async generateApplication(prompt) {
    if (!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const system = `Tu es un assistant qui génère une petite application SvelteKit.
Retourne STRICTEMENT un objet JSON (pas de texte autour) où chaque clé est un nom de fichier et chaque valeur est son contenu.
Contraintes:
- Inclure OBLIGATOIREMENT: README.md, src/App.svelte, src/routes/+page.svelte, src/components/Example.svelte, package.json
- Utiliser Tailwind si pertinent (indiquer config minimale si nécessaire)
- Pas d'explications, seulement JSON pur.
- Pas de balises de code.
- Limiter à 8 fichiers maximum.
`;
    const user = `Génère une application basée sur: ${prompt}`;
    const body = {
      model: 'gpt-3.5-turbo',
      messages: [ { role:'system', content: system }, { role:'user', content: user } ],
      temperature: 0.6,
      max_tokens: 1800
    };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let errTxt = await response.text();
      throw new Error('Erreur OpenAI app: ' + errTxt);
    }
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Réponse vide');
    // Nettoyage éventuel de fences
    raw = raw.replace(/^```(json)?/i,'').replace(/```$/,'').trim();
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { throw new Error('JSON invalide renvoyé: '+ e.message); }
    return parsed;
  }

  async generateBlueprint(query) {
    if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const system = `Tu es un architecte logiciel spécialisé en SvelteKit, Tailwind et génération de sites (blog, e-commerce, portfolio, SaaS, documentation).
Reçois une requête utilisateur courte (ex: "blog sur les motos") et PRODUIS UNIQUEMENT un JSON (pas de markdown) détaillant un blueprint.
Format strict JSON:
{
  "original_query": string,
  "detected_site_type": string,             // blog | ecommerce | portfolio | saas | docs | landing | mix
  "audience": string,
  "goals": [string],
  "keywords": [string],
  "seo_meta": { "title": string, "description": string, "primary_keywords": [string] },
  "color_palette": [string],                // 4-6 hex
  "routes": [ { "path": string, "purpose": string, "sections": [string] } ],
  "core_components": [string],              // liste de composants réutilisables (Header, Hero, ArticleCard...)
  "data_models": [ { "name": string, "fields": [ {"name": string, "type": string, "required": boolean } ] } ],
  "sample_content": {                       // ex articles ou produits
     "articles": [ { "title": string, "slug": string, "excerpt": string, "hero_image_prompt": string, "body_markdown": string } ]
  },
  "generation_strategy": {
     "files": [ { "filename": string, "role": string, "depends_on": [string] } ],
     "priority_order": [string]
  },
  "recommended_prompts": {                  // prompts détaillés prêts à injecter pour génération multi-fichiers
     "app_level": string,
     "per_file": [ { "filename": string, "prompt": string } ]
  }
}
Règles:
- AUCUNE explication hors JSON
- Pas de commentaires
- Contenu concis mais exploitable
- 3 à 5 articles d'exemple si blog
- Hex sans # ? NON -> toujours avec #
SI la requête est ambiguë: fais des hypothèses raisonnables et note-les discrètement dans "goals".
`;
    const user = `Requête: ${query}`;
    const body = {
      model: 'gpt-3.5-turbo',
      messages: [ { role:'system', content: system }, { role:'user', content: user } ],
      temperature: 0.65,
      max_tokens: 1800
    };
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body)
    });
    if(!response.ok){
      const txt = await response.text();
      throw new Error('Erreur OpenAI blueprint: '+txt);
    }
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim();
    if(!raw) throw new Error('Réponse vide');
    raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
    try {
      return JSON.parse(raw);
    } catch(e){
      // stratégie de récupération simple: tenter d'extraire bloc JSON principal
      const match = raw.match(/\{[\s\S]*\}/);
      if(match){
        try { return JSON.parse(match[0]); } catch(_){}
      }
      throw new Error('JSON blueprint invalide: '+ e.message);
    }
  }
}

export const openaiService = new OpenAIService();
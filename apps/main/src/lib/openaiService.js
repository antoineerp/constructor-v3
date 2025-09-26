// IMPORTANT: utilisation de $env/dynamic/private pour éviter l'injection statique
// afin que la clé ne soit pas écrite en dur dans le bundle build côté serveur.
import { env } from '$env/dynamic/private';

export class OpenAIService {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.claudeKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY; // support deux noms
  }

  async generateEmbedding(input, { model = 'text-embedding-3-small' } = {}) {
    if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const cleaned = typeof input === 'string' ? input.slice(0,8000) : JSON.stringify(input).slice(0,8000);
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model, input: cleaned })
    });
    if(!response.ok){
      const txt = await response.text();
      throw new Error('Erreur embedding: '+txt);
    }
    const data = await response.json();
    return data.data?.[0]?.embedding || [];
  }

  async generateComponent(prompt, type = 'generic', { model = 'gpt-4o-mini', provider='openai' } = {}) {
    if (provider === 'claude') {
      if(!this.claudeKey) throw new Error('Clé API Claude manquante');
      const systemPrompt = `Tu es un expert Svelte/Tailwind. Génère UNIQUEMENT le markup HTML Tailwind d'un composant ${type}. Pas de <script>, pas de markdown.`;
      const userPrompt = `Description: ${prompt}`;
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key': this.claudeKey,
          'anthropic-version':'2023-06-01'
        },
        body: JSON.stringify({
          model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620',
          max_tokens: 800,
          system: systemPrompt,
          messages:[{ role:'user', content: userPrompt }]
        })
      });
      if(!resp.ok){ const t= await resp.text(); throw new Error('Erreur Claude: '+t); }
      const data = await resp.json();
      const contentBlock = data.content?.[0]?.text?.trim() || '';
      if(!contentBlock) throw new Error('Sortie vide Claude');
      return contentBlock.replace(/```(html|svelte)?\n?/g,'').replace(/```$/,'').trim();
    }
    if (!this.apiKey) throw new Error('Clé API OpenAI manquante');

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
          model,
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

  async generateApplication(prompt, { model = 'gpt-4o-mini', maxFiles = 20, provider='openai' } = {}) {
    if(provider==='claude'){
      if(!this.claudeKey) throw new Error('Clé API Claude manquante');
      const system = `Tu génères une application SvelteKit. Retourne UNIQUEMENT JSON objet { "filename":"CONTENU" }. Max ${maxFiles} fichiers.`;
      const user = prompt;
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','x-api-key':this.claudeKey,'anthropic-version':'2023-06-01' },
        body: JSON.stringify({ model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620', max_tokens: 3000, system, messages:[{role:'user', content:user}] })
      });
      if(!resp.ok){ const t = await resp.text(); throw new Error('Erreur Claude app: '+t); }
      const data = await resp.json();
      let raw = data.content?.map(c=> c.text).join('\n')?.trim() || '';
      raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
      let parsed; try { parsed = JSON.parse(raw); } catch(e){ throw new Error('JSON invalide Claude: '+e.message); }
      return parsed;
    }
    if (!this.apiKey) throw new Error('Clé API OpenAI manquante');
  const system = `Tu es un assistant qui génère une application SvelteKit modulaire.
Retourne STRICTEMENT un objet JSON (aucun texte hors JSON) où chaque clé est un nom de fichier (chemins relatifs) et chaque valeur son contenu COMPLET.
Contraintes:
- Inclure si non déjà présent: README.md, package.json, src/routes/+page.svelte
- Si besoin de composants réutilisables, crée src/lib/components/* ou src/components/*
- Utiliser Tailwind quand pertinent (si config absente, inclure tailwind.config.cjs minimal + postcss.config.cjs + src/app.css)
- Pas d'explications NI commentaires hors code
- Pas de fences markdown
- Maximum ${maxFiles} fichiers (priorise les routes et composants clés)
- Les fichiers Svelte doivent être valides.
`;
    const user = `Génère une application basée sur: ${prompt}`;
    const body = {
      model,
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

  async generateBlueprint(query, { model = 'gpt-4o-mini', provider='openai' } = {}) {
    if(provider==='claude'){
      if(!this.claudeKey) throw new Error('Clé API Claude manquante');
      const system = `Blueprint SvelteKit JSON strict (voir structure). Aucun texte hors JSON.`;
      const user = query;
      const resp = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':this.claudeKey,'anthropic-version':'2023-06-01'}, body: JSON.stringify({ model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620', max_tokens: 1800, system, messages:[{role:'user', content:user}] }) });
      if(!resp.ok){ const t= await resp.text(); throw new Error('Erreur Claude blueprint: '+t); }
      const data = await resp.json();
      let raw = data.content?.map(c=> c.text).join('\n').trim();
      raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
      try { return JSON.parse(raw); } catch(e){ throw new Error('JSON blueprint invalide Claude: '+e.message); }
    }
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
      model,
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

  async generateIntentExpansion(query, { model = 'gpt-4o-mini', provider='openai' } = {}) {
    if(provider==='claude'){
      if(!this.claudeKey) throw new Error('Clé API Claude manquante');
      const system = `Expansion d'intention JSON strict.`;
      const user = query;
      const resp = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':this.claudeKey,'anthropic-version':'2023-06-01'}, body: JSON.stringify({ model: env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620', max_tokens: 600, system, messages:[{role:'user', content:user}] }) });
      if(!resp.ok){ const t= await resp.text(); throw new Error('Erreur Claude expansion: '+t); }
      const data = await resp.json();
      let raw = data.content?.map(c=> c.text).join('\n').trim();
      raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
      try { return JSON.parse(raw); } catch(e){ throw new Error('JSON expansion invalide Claude: '+e.message); }
    }
    if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const system = `Tu es un assistant produit. Reçois une requête brute utilisateur courte et produis UNIQUEMENT un JSON enrichi.
Format JSON strict:
{
  "original_query": string,
  "enriched_query": string,
  "style_keywords": [string],
  "feature_hints": [string],
  "tone_keywords": [string]
}
Règles:
- Pas de texte hors JSON
- 3 à 6 style_keywords max
- feature_hints uniquement pertinents (parmi auth,dashboard,search,i18n,invoicing,blog,docs,notifications)
- enriched_query < 280 caractères, fusion claire des intentions.`;
    const user = `Requête: ${query}`;
    const body = { model, messages:[{role:'system',content:system},{role:'user',content:user}], temperature:0.5, max_tokens:400 };
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${this.apiKey}` }, body: JSON.stringify(body) });
    if(!response.ok){ const txt = await response.text(); throw new Error('Erreur expansion intent: '+txt); }
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim();
    if(!raw) throw new Error('Réponse vide expansion');
    raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
    try { return JSON.parse(raw); } catch(e){ throw new Error('JSON expansion invalide: '+e.message); }
  }
}

// Ajout hors du bloc JSON du prompt blueprint: méthodes utilitaires supplémentaires
OpenAIService.prototype.generateImage = async function(prompt, { model = env.OPENAI_IMAGE_MODEL || 'gpt-image-1', size = '1024x1024', quality = 'standard' } = {}) {
  if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
  const body = { model, prompt, size, quality, n:1, response_format:'b64_json' };
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${this.apiKey}` },
    body: JSON.stringify(body)
  });
  if(!response.ok){
    const txt = await response.text();
    throw new Error('Erreur génération image: '+txt);
  }
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if(!b64) throw new Error('Aucune image retournée');
  return { base64: b64, model };
};

export const openaiService = new OpenAIService();
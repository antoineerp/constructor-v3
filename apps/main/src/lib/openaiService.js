// IMPORTANT: utilisation de $env/dynamic/private pour éviter l'injection statique
// afin que la clé ne soit pas écrite en dur dans le bundle build côté serveur.
import { env } from '$env/dynamic/private';
import { extractJson, withJsonEnvelope } from '$lib/ai/jsonExtractor.js';
import { topComponentCodeSnippets } from '$lib/catalog/components.js';
import { buildPrompt } from '$lib/prompt/promptLibrary.js';
import { simpleCache } from '$lib/quality/simpleCache.js';

// Résolution simplifiée des imports relatifs vers des fichiers Svelte.
// from: fichier courant (ex: src/routes/+page.svelte)
// target: chemin relatif importé (./Header, ../lib/components/Card.svelte, etc.)
// Retourne un chemin normalisé avec extension .svelte si manquante.
function resolveRelativeSvelte(from, target) {
  try {
    if (!from || !target) return null;
    const baseSegs = from.split('/');
    baseSegs.pop(); // enlever le nom du fichier
    const relSegs = target.split('/');
    for (const seg of relSegs) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') {
        if (baseSegs.length) baseSegs.pop();
      } else {
        baseSegs.push(seg);
      }
    }
    let out = baseSegs.join('/');
    if (!/\.svelte$/i.test(out)) out += '.svelte';
    // normalisation double slash éventuel
    out = out.replace(/\/+/g, '/');
    return out;
  } catch (_e) {
    return null;
  }
}

export class OpenAIService {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.claudeKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY; // support deux noms
  }

  // Méthode pour récupérer les clés dynamiquement (depuis admin ou env)
  async getApiKeys() {
    try {
      // Essayer d'abord les clés admin
      const response = await fetch('/api/admin/keys');
      if (response.ok) {
        const data = await response.json();
        return data.keys || {};
      }
    } catch (e) {
      console.warn('Impossible de récupérer les clés admin:', e.message);
    }
    
    // Fallback sur les variables d'environnement
    return {
      openai: this.apiKey,
      claude: this.claudeKey
    };
  }

  // Obtenir la clé OpenAI actuelle
  async getCurrentOpenAIKey() {
    const keys = await this.getApiKeys();
    return keys.openai || this.apiKey;
  }

  // Obtenir la clé Claude actuelle  
  async getCurrentClaudeKey() {
    const keys = await this.getApiKeys();
    return keys.claude || this.claudeKey;
  }

  async generateEmbedding(input, { model = 'text-embedding-3-small' } = {}) {
    if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const cleaned = typeof input === 'string' ? input.slice(0,8000) : JSON.stringify(input).slice(0,8000);
    const cacheKey = simpleCache.key('embedding', { model, input: cleaned });
    const cached = simpleCache.get(cacheKey);
    if(cached) return cached;
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
    const emb = data.data?.[0]?.embedding || [];
    simpleCache.set(cacheKey, emb, 60*30); // 30 min
    return emb;
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
    if (!this.apiKey) {
      // Fallback offline direct (aucune requête réseau, composant plausible)
      return `<script>export let title = "Titre de la carte"; export let content = "Contenu de la carte";<\/script>\n<div class=\"p-4 border rounded bg-gray-50\">\n  <h3 class=\"font-semibold text-purple-600\">{title}<\/h3>\n  <p class=\"text-sm text-gray-600\">{content}<\/p>\n  <slot/><\/div>`;
    }

  const systemPrompt = `Tu es un expert Svelte/Tailwind CSS spécialisé dans la création de composants modernes et élégants.

EXIGENCES DESIGN DE QUALITÉ:
- Design moderne avec gradients, ombres subtiles, bordures arrondies
- Palette de couleurs harmonieuse et professionnelle 
- Micro-animations CSS (transitions, hover effects, focus states)
- Typographie riche avec variété de poids et tailles
- Espacements harmonieux et hiérarchie visuelle claire
- Icônes Font Awesome appropriées (fas fa-*) pour enrichir l'UI
- États interactifs (hover, focus, active, disabled) bien définis
- Responsive design avec breakpoints appropriés

FONCTIONNALITÉS:
- Script Svelte avec logique métier appropriée (état, événements, props)
- Interactions utilisateur fluides et intuitives
- Validation et feedback visuel si applicable
- Props configurables avec valeurs par défaut sensées
- Slots pour personnalisation si pertinent

TECHNIQUE:
- Code Svelte syntaxiquement parfait et optimisé
- Tailwind CSS exclusivement (pas de styles custom)
- Classes utilitaires bien structurées et lisibles
- Accessibilité ARIA appropriée (labels, roles, states)
- Performance optimisée (pas de calculs coûteux)

Types: button | card | input | modal | navigation | generic
Retourne UNIQUEMENT le code Svelte sans markdown ni commentaires.`;

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

  async generateApplication(prompt, { model = 'gpt-4o-mini', maxFiles = 20, provider='openai', blueprint=null, fileAnalyses=null, uiStack=null, blueprintId=null } = {}) {
    // Fallback hors API pour tests / mode offline quand aucune clé
    if(provider==='openai' && !this.apiKey){
      return {
        'README.md': '# Offline Blueprint\nGénéré sans clé API. Prompt: '+prompt,
        'src/routes/+page.svelte': `<script>let n=0; const inc=()=>n++;<\/script>\n<h1 class=\"text-xl font-bold text-purple-600\">Offline App<\/h1>\n<button class=\"mt-2 px-2 py-1 bg-purple-600 text-white rounded\" on:click={inc}>Compteur {n}<\/button>`,
        'src/routes/about/+page.svelte': '<h2>À propos offline</h2><p>Mode dégradé.</p>'
      };
    }
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
    // Injection top-k composants (code tronqué) pour favoriser la réutilisation réelle
    let componentContext = '';
    if(blueprint){
      try {
        const top = topComponentCodeSnippets(blueprint, 5);
        if(top.length){
          componentContext = top.map(t=>`// COMPONENT: ${t.name} (${t.filename})\n/* ${t.purpose} */\n${t.snippet}\n`).join('\n');
          if (componentContext.length > 8000) {
            componentContext = componentContext.slice(0, 8000) + '\n/* ...contexte composants tronqué... */\n';
          }
        }
      } catch(e){ /* ignore */ }
    }
    // --- Retrieval vectoriel (snippets existants) ---
    let retrievalContext = '';
    let retrievalStats = null;
    if(blueprint){
      try {
        const { buildRetrievalContext } = await import('$lib/ai/retrieval.js');
        const { contextBlock, stats } = await buildRetrievalContext(blueprint, { k:8, maxInject:5, maxChars:480, minScore:0.74 });
        retrievalContext = contextBlock;
        retrievalStats = stats;
      } catch(e){ /* ignore retrieval errors */ }
    }

    // Préparer bloc analyses fichiers (images/pdf/texte) si fourni
    let analysesBlock = '';
    let analysesHash = 'none';
    if(fileAnalyses && Array.isArray(fileAnalyses) && fileAnalyses.length){
      try {
        const trimmed = fileAnalyses.slice(0,5).map(a=>{
          const colors = a.analysis?.colors?.slice?.(0,6) || [];
          const comps = a.analysis?.components || a.analysis?.objects || [];
          const summary = a.analysis?.summary || a.analysis?.note || a.analysis?.raw || a.excerpt || '';
          return {
            hash: a.hash,
            kind: a.kind,
            summary: typeof summary === 'string' ? summary.slice(0,180) : JSON.stringify(summary).slice(0,180),
            colors,
            components: comps.slice(0,8)
          };
        });
        const serialized = JSON.stringify(trimmed);
        // Hash simple djb2 pour inclure dans la clé de cache (stable tant que trimmed constant)
        let h=5381; for(let i=0;i<serialized.length;i++){ h=((h*33) ^ serialized.charCodeAt(i)) >>> 0; }
        analysesHash = h.toString(36);
        analysesBlock = '\n/* ANALYSES_FICHIERS hash:'+analysesHash+'\n' + serialized.slice(0,1900) + '\n*/\n';
      } catch(_e){ /* ignore */ }
    }

    const system = `Tu es un assistant qui génère une application SvelteKit modulaire.
Si un bloc ANALYSES_FICHIERS est présent (commentaire JS), utilise ses indices pour:
- orienter la palette (colors) ou compléter blueprint
- créer 0 à 5 composants réutilisables pertinents (src/lib/components/*)
- ajuster routes / sections.
Ne recopie PAS intégralement les résumés ou listes, réutilise l'information de manière synthétique.` + analysesBlock + `
Chaque fichier .svelte doit être un composant/route Svelte VALIDE avec une balise <script> (sauf cas purement statique évident) exportant éventuellement des props ou définissant un petit état (ex: let items = [...] ; let loading = false). Pas de dépendances externes non demandées. Préfère la réactivité Svelte plutôt que du simple HTML statique.
Retourne STRICTEMENT un objet JSON (aucun texte hors JSON) où chaque clé est un nom de fichier (chemins relatifs) et chaque valeur son contenu COMPLET.
Contraintes:
- Inclure si non déjà présent: README.md, package.json, src/routes/+page.svelte
- Si besoin de composants réutilisables, crée src/lib/components/* ou src/components/*
- Utiliser Tailwind quand pertinent (si config absente, inclure tailwind.config.cjs minimal + postcss.config.cjs + src/app.css)
- Pas d'explications NI commentaires hors code
- Pas de fences markdown
- Maximum ${maxFiles} fichiers (priorise les routes et composants clés)
- Les fichiers Svelte doivent être valides.
// Réutilise composants ci-dessous plutôt que réécrire si alignés avec besoin:
${componentContext}
${retrievalContext}
`;
    const enveloped = withJsonEnvelope(`Génère une application basée sur: ${prompt}${analysesBlock? '\nInspiration: analyses fichiers fournies (ne pas les répéter textuellement).':''}`);
    const attempt = async (retryIndex=0, lastError=null, lastRaw='') => {
      const body = { model, messages:[{role:'system',content:system},{role:'user',content:enveloped}], temperature:0.2, max_tokens:1800 };
      const cacheKey = simpleCache.key('generateApplication', { prompt, model, retryIndex, aHash: analysesHash });
      const cached = simpleCache.get(cacheKey);
      if(cached) return cached;
      const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.apiKey}`}, body: JSON.stringify(body) });
      if(!response.ok){ const txt = await response.text(); throw new Error('Erreur OpenAI app: '+txt); }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim();
      if(!raw){ if(retryIndex<2) return attempt(retryIndex+1, 'Réponse vide'); throw new Error('Réponse vide'); }
      let extracted = extractJson(raw, { allowArrays:false });
      if(!extracted.ok){
        if(retryIndex < 2){
          // Prompt correctif: demander uniquement la portion JSON
          const fixPrompt = withJsonEnvelope(`La sortie précédente n'était pas JSON strict. Corrige et renvoie UNIQUEMENT l'objet JSON complet. Erreur: ${extracted.error}`);
          return attempt(retryIndex+1, extracted.error, raw + '\n---FIXPROMPT---\n'+fixPrompt);
        }
        throw new Error('Extraction JSON échouée: '+extracted.error);
      }
      const files = extracted.data;
      try {
        const { validateApplicationFiles } = await import('$lib/ai/schemas.js');
        const res = validateApplicationFiles(files);
        if(!res.ok){
          if(retryIndex===0) return attempt(1);
          files.__schema_errors = res.errors;
        }
      } catch(e){ /* ignore schema load */ }
      if(retrievalStats) files.__retrieval_meta = retrievalStats;
      simpleCache.set(cacheKey, files, 60*10); // 10 min
      return files;
    };
    const files = await attempt(0);
    // --- Injection dépendances & scaffolding stack UI (MVP) ---
    try {
      if(uiStack){
        // Assurer package.json existe
        if(!files['package.json']){
          files['package.json'] = JSON.stringify({ name:'app', private:true, version:'0.0.0', scripts:{ dev:'vite', build:'vite build', preview:'vite preview' }, devDependencies:{}, dependencies:{} }, null, 2);
        }
        let pkg; try { pkg = JSON.parse(files['package.json']); } catch(_e){ pkg = { name:'app', private:true, version:'0.0.0', scripts:{ dev:'vite' }, dependencies:{}, devDependencies:{} }; }
        pkg.devDependencies = pkg.devDependencies||{}; pkg.dependencies = pkg.dependencies||{};
        // Core dépendances toujours
        pkg.devDependencies['@sveltejs/kit'] = pkg.devDependencies['@sveltejs/kit'] || '^2.5.0';
        pkg.devDependencies['svelte'] = pkg.devDependencies['svelte'] || '^5.0.0';
        pkg.devDependencies['vite'] = pkg.devDependencies['vite'] || '^5.4.0';
        pkg.devDependencies['tailwindcss'] = pkg.devDependencies['tailwindcss'] || '^3.4.0';
        pkg.devDependencies['postcss'] = pkg.devDependencies['postcss'] || '^8.4.0';
        pkg.devDependencies['autoprefixer'] = pkg.devDependencies['autoprefixer'] || '^10.4.0';
        pkg.dependencies['bits-ui'] = pkg.dependencies['bits-ui'] || '^0.21.0';
        // Stack spécifique
        if(uiStack === 'shadcn'){
          pkg.dependencies['shadcn-svelte'] = pkg.dependencies['shadcn-svelte'] || '^0.8.0';
          pkg.dependencies['lucide-svelte'] = pkg.dependencies['lucide-svelte'] || '^0.445.0';
        } else if(uiStack === 'skeleton'){
          pkg.dependencies['@skeletonlabs/skeleton'] = pkg.dependencies['@skeletonlabs/skeleton'] || '^2.9.0';
        } else if(uiStack === 'flowbite'){
          pkg.dependencies['flowbite-svelte'] = pkg.dependencies['flowbite-svelte'] || '^0.46.0';
          pkg.dependencies['flowbite'] = pkg.dependencies['flowbite'] || '^2.3.0';
        }
        files['package.json'] = JSON.stringify(pkg, null, 2);
        // Tailwind config minimal si absent
        if(!files['tailwind.config.cjs']){
          const plugins = [];
          if(uiStack==='skeleton') plugins.push("require('@skeletonlabs/skeleton/tailwind/skeleton.cjs')");
          if(uiStack==='flowbite') plugins.push("require('flowbite/plugin')");
          files['tailwind.config.cjs'] = `module.exports = { content:["./src/**/*.{svelte,js,ts}"], theme:{ extend:{} }, plugins:[${plugins.join(',')}] }`;
        }
        if(!files['postcss.config.cjs']) files['postcss.config.cjs'] = `module.exports={ plugins:{ tailwindcss:{}, autoprefixer:{} } }`;
        if(!files['src/app.css']) files['src/app.css'] = '@tailwind base;@tailwind components;@tailwind utilities;';
        // Layout injection (squelette pour stack)
        if(!files['src/routes/+layout.svelte']){
          let banner = '';
            if(uiStack==='shadcn') banner = '<div class="text-[10px] px-2 py-1 bg-purple-600/10 text-purple-700 rounded mb-4">shadcn + Bits UI</div>';
            else if(uiStack==='skeleton') banner = '<div class="text-[10px] px-2 py-1 bg-emerald-600/10 text-emerald-700 rounded mb-4">Skeleton + Bits UI</div>';
            else if(uiStack==='flowbite') banner = '<div class="text-[10px] px-2 py-1 bg-blue-600/10 text-blue-700 rounded mb-4">Flowbite + Bits UI</div>';
          files['src/routes/+layout.svelte'] = `<script>export let data;\n</script>\n<div class=\"min-h-screen font-sans bg-gray-50 text-gray-800\">\n<header class=\"p-4 border-b bg-white\"><h1 class=\"font-bold\">App Générée</h1></header>\n<main class=\"max-w-5xl mx-auto p-6\">${banner}<slot/>\n</main>\n<footer class=\"p-4 text-xs text-gray-500\">Generated (${uiStack})</footer>\n</div>`;
        }
        // Marquer manifest stack
        files['ui-stack.json'] = JSON.stringify({ stack: uiStack, blueprint: blueprintId||null, generatedAt: new Date().toISOString() }, null, 2);
      }
    } catch(_e){ /* ignore injection errors */ }
    // Vérification imports manquants simples
    const missingImports = [];
    const fileNames = new Set(Object.keys(files));
    for(const [fname, content] of Object.entries(files)){
      if(!fname.endsWith('.svelte')) continue;
      const importRegex = /import\s+[^'";]+from\s+['"]([^'";]+)['"]/g;
      let m; while((m = importRegex.exec(content))){
        const target = m[1];
        if(target.startsWith('.') || target.startsWith('..')){
          // relative path -> derive probable file
          const resolved = resolveRelativeSvelte(fname, target);
          if(resolved && !fileNames.has(resolved)) missingImports.push({ source: fname, target: resolved });
        }
      }
    }
    if(missingImports.length){
      // Dédoublonnage
      const unique = new Map();
      for (const mi of missingImports) if(!unique.has(mi.target)) unique.set(mi.target, mi);
      const capped = Array.from(unique.values()).slice(0, 10); // limite sécurité
      for(const miss of capped){
        if(!fileNames.has(miss.target)){
          files[miss.target] = `<script>/* Stub auto-généré pour dépendance manquante ${miss.target} */\n  // TODO: Implémenter le composant réel\n  export let data;\n</script>\n<div class=\"stub-component border border-dashed p-2 text-sm text-gray-500\">Stub: ${miss.target}</div>\n`;
          fileNames.add(miss.target);
        }
      }
    } // fin if missingImports
    return files;
  }

  /**
   * Multi-variantes de génération application.
   * variants: array ex ['applicationStrict','applicationBase'] (ordre = priorité). La première qui produit JSON valide sans erreurs schema majeures est sélectionnée.
   */
  async generateApplicationMultiVariant(query, { variants=['applicationStrict','applicationBase'], model='gpt-4o-mini', maxFiles=20, blueprint=null } = {}) {
    const results = [];
    for(const variant of variants){
      let files=null; let error=null; let schemaErrors=null; let started=Date.now();
      try {
        const variantPrompt = buildPrompt(variant, { query, maxFiles });
        files = await this.generateApplication(variantPrompt, { model, maxFiles, provider:'openai', blueprint });
        schemaErrors = files.__schema_errors || null;
      } catch(e){ error = e.message; }
      results.push({ variant, durationMs: Date.now()-started, ok: !!files && !error, error, schemaErrorsCount: schemaErrors ? schemaErrors.length : 0, files });
      // Sélection early si propre
      if(files && !error && (!schemaErrors || schemaErrors.length===0)) break;
    }
    // Sélection finale: meilleure entrée ok sinon dernière
    let winner = results.find(r=> r.ok && r.schemaErrorsCount===0) || results.find(r=> r.ok) || results[results.length-1];
    if(!winner || !winner.files) throw new Error('Aucune variante application valide: '+ results.map(r=> `${r.variant}:${r.error||'ok'}`).join('; '));
    winner.files.__variant_meta = {
      tried: results.map(({variant,durationMs,ok,error,schemaErrorsCount})=>({variant,durationMs,ok,error,schemaErrorsCount})),
      selected: winner.variant,
      query,
      maxFiles
    };
    return winner.files;
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
    const system = `Tu es un architecte logiciel spécialisé en SvelteKit. Retourne STRICTEMENT un JSON validant le schéma conceptuel du blueprint. AUCUN texte hors JSON.`;
    const envelope = withJsonEnvelope(`Génère un blueprint complet pour la requête: ${query}\nExigences clés: routes structurées, 3-5 articles si blog, palette 4-6 hex (#...), prompts par fichier.`);
    const attempt = async (retryIndex=0, lastError=null, lastRaw='') => {
      const body = { model, messages:[{role:'system',content:system},{role:'user',content:envelope}], temperature: 0.4, max_tokens: 1800 };
      const cacheKey = simpleCache.key('generateBlueprint', { query, model, retryIndex });
      const cached = simpleCache.get(cacheKey);
      if(cached) return cached;
      const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.apiKey}`}, body: JSON.stringify(body) });
      if(!response.ok){ const txt = await response.text(); throw new Error('Erreur OpenAI blueprint: '+txt); }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || '';
      const extracted = extractJson(raw, { allowArrays:false });
      if(!extracted.ok){
        if(retryIndex < 2){
          const fixEnvelope = withJsonEnvelope(`La tentative précédente contenait un JSON invalide (${extracted.error}). Fournis uniquement le blueprint JSON complet et corrigé.`);
          return attempt(retryIndex+1, extracted.error, raw+'\n---FIX---\n'+fixEnvelope);
        }
        throw new Error('Extraction JSON blueprint échouée: '+extracted.error);
      }
      const blueprint = extracted.data;
      // Validation légère
      try {
        const { validateBlueprint } = await import('$lib/ai/schemas.js');
        const res = validateBlueprint(blueprint);
        if(!res.ok){
          if(retryIndex===0){
            // tenter une 2ème fois avec message d'erreurs
            return attempt(1);
          }
          blueprint._schema_errors = res.errors;
        }
      } catch(e){ /* ignore validation load errors */ }
      simpleCache.set(cacheKey, blueprint, 60*15); // 15 min
      return blueprint;
    };
    return attempt(0);
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
  const cacheKey = simpleCache.key('intentExpansion', { query });
  const cached = simpleCache.get(cacheKey);
  if(cached) return cached;
  const response = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${this.apiKey}` }, body: JSON.stringify(body) });
    if(!response.ok){ const txt = await response.text(); throw new Error('Erreur expansion intent: '+txt); }
    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim();
    if(!raw) throw new Error('Réponse vide expansion');
    raw = raw.replace(/^```json\n?/i,'').replace(/```$/,'').trim();
    try { const parsed = JSON.parse(raw); simpleCache.set(cacheKey, parsed, 60*10); return parsed; } catch(e){ throw new Error('JSON expansion invalide: '+e.message); }
  }

  async generateCriticPatches(envelopedPrompt, { model='gpt-4o-mini', provider='openai' } = {}) {
    if(provider==='claude') throw new Error('Critic Claude non implémenté');
    if(!this.apiKey) throw new Error('Clé API OpenAI manquante');
    const system = 'Tu es un assistant correctif SvelteKit. Retourne STRICTEMENT JSON {"filename":"CONTENU",...} sans texte additionnel.';
    const attempt = async (retry=0) => {
      const body = { model, messages:[{role:'system',content:system},{role:'user',content:envelopedPrompt}], temperature:0.1, max_tokens:1200 };
      const cacheKey = simpleCache.key('criticPatches', { hash: envelopedPrompt.slice(0,200) });
      const cached = simpleCache.get(cacheKey);
      if(cached) return cached;
      const response = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${this.apiKey}`}, body: JSON.stringify(body) });
      if(!response.ok){ const t= await response.text(); throw new Error('Erreur OpenAI critic: '+t); }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content?.trim() || '';
      const extracted = extractJson(raw, { allowArrays:false });
      if(!extracted.ok){ if(retry===0) return attempt(1); throw new Error('Extraction critic échouée: '+extracted.error); }
      simpleCache.set(cacheKey, extracted.data, 60*5); // courte durée
      return extracted.data;
    };
    return attempt(0);
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
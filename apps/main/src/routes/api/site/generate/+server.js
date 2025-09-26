import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import { openaiService } from '$lib/openaiService.js';
import { supabase as clientSupabase } from '$lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { summarizeCatalog, selectComponentsForBlueprint } from '$lib/catalog/components.js';
import { buildGlobalGenerationPromptAsync } from '$lib/prompt/promptBuilders.js';
import { validateAndFix, unifyPalette, addAccessibilityFixes } from '$lib/validator/svelteValidator.js';
import { validateFiles } from '$lib/validation/validator.js';
import { upsertSnippet } from '$lib/embeddings';
import { runSvelteCheckSnippet } from '$lib/validation/svelteCheckRunner.js';

// Orchestrateur: génère blueprint et/ou code application selon état projet.
// Body: { query?: string, projectId?: string, regenerateFile?: string }
// Nouvelles persistance: table project_files (un enregistrement par fichier généré)
// Réponses:
//  - Génération initiale: { success, blueprint, files, project }
//  - Régénération fichier: { success, regenerated: filename, fileContent }
export async function POST(event) {
  const { request, locals } = event;
  try {
    const body = await request.json();
  const { query, projectId, regenerateFile, simpleMode, generationProfile = 'safe', provider='openai', chatContext = [] } = body;
    // Récupération token Supabase (passé côté client via Authorization: Bearer <access_token>)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let userId = null;
    let serverSupabase = null;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      serverSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      try {
        const { data: { user }, error: userErr } = await serverSupabase.auth.getUser();
        if (!userErr && user) userId = user.id;
      } catch (e) {
        console.warn('Impossible de récupérer user depuis token', e);
      }
    }
    // Fallback: ne pas utiliser clientSupabase côté serveur pour auth sensible, mais permet encore la lecture si pas RLS stricte.

    if (!query && !projectId) {
      return json({ success:false, error:'query ou projectId requis' }, { status:400 });
    }
  // Mode éphémère: si pas d'userId et pas de projectId on autorise génération (pas de persistance)
  let ephemeral = !userId && !projectId;

    let project = null;
    if (projectId) {
      try {
        // Vérifier ownership si userId connu
        const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
        if (userId) queryBuilder.eq('user_id', userId);
        const { data, error } = await queryBuilder.single();
        if (error) throw error;
        // Si hook a identifié user et projet a un owner explicite, vérifier
        if(locals.user && data.owner_id && data.owner_id !== locals.user.id){
          return json({ success:false, error:'Accès refusé (owner mismatch)' }, { status:403 });
        }
        project = data;
      } catch(dbErr){
        if(/relation .* does not exist/i.test(dbErr.message||'')){
          console.warn('[site/generate] Table projects absente, fallback mode éphémère.');
          ephemeral = true; project = null; // on continue sans persistance
        } else {
          throw dbErr;
        }
      }
    }

    // Si régénération d'un fichier spécifique
    if (regenerateFile && project?.blueprint_json) {
      // Chercher le fichier existant dans project_files pour confirmer existence (optionnel)
      const { data:existingFile } = await clientSupabase.from('project_files').select('*').eq('project_id', project.id).eq('filename', regenerateFile).maybeSingle();
      const blueprint = project.blueprint_json;
      const per = blueprint?.recommended_prompts?.per_file || [];
      const target = per.find(p => p.filename === regenerateFile);
      if (!target) return json({ success:false, error:'Prompt fichier introuvable' }, { status:404 });

      const singlePrompt = `Tu améliores ou régénères un fichier unique pour une application SvelteKit. FICHIER CIBLE: ${regenerateFile}. Fournis UNIQUEMENT le contenu brut du fichier sans markdown ni explications. Contexte blueprint: ${JSON.stringify({ routes: blueprint.routes, components: blueprint.core_components, site_type: blueprint.detected_site_type }).slice(0,1800)}\n${existingFile ? 'Ancienne version:\n'+existingFile.content.slice(0,2000) : ''}`;
      const result = await openaiService.generateApplication(singlePrompt);
      const newContent = result[regenerateFile] || Object.values(result)[0];
      if (!newContent) return json({ success:false, error:'Aucun contenu régénéré' }, { status:500 });
      // Upsert dans project_files
      const { error:pfErr } = await clientSupabase.from('project_files')
        .upsert({ project_id: project.id, filename: regenerateFile, content: newContent, stage: 'final', pass_index: 0 }, { onConflict: 'project_id,filename' });
      if (pfErr) throw pfErr;
      // Mettre à jour l'agrégat code_generated (option legacy)
      const updatedCode = { ...(project.code_generated||{}), [regenerateFile]: newContent };
      await clientSupabase.from('projects').update({ code_generated: updatedCode }).eq('id', project.id);
      return json({ success:true, regenerated: regenerateFile, fileContent: newContent });
    }

    // Génération complète si pas encore blueprint
    let blueprint = project?.blueprint_json;
    if (!blueprint) {
      const effectiveQuery = query || project?.original_query;
      if (!effectiveQuery) return json({ success:false, error:'Impossible de déterminer la requête de base' }, { status:400 });
      // Construire un contexte conversationnel (dernier messages utilisateur) pour enrichir si fourni
      let conversationSnippet = '';
      if (Array.isArray(chatContext) && chatContext.length) {
        const trimmed = chatContext.map(m=> (m||'').toString().slice(0,160)).slice(-6);
        conversationSnippet = trimmed.join(' \n ');
      }
      let compositeQuery = effectiveQuery;
      if (conversationSnippet && conversationSnippet.length > 20) {
        compositeQuery = `Contexte conversation (extraits récents):\n${conversationSnippet}\nRequête finale: ${effectiveQuery}`.slice(0,4000);
      }
      // Intent expansion (Phase C) avant blueprint pour enrichir le contexte
      let intentExpansion = null;
      try { intentExpansion = await openaiService.generateIntentExpansion(compositeQuery, { provider }); } catch(e){ console.warn('Intent expansion failed', e.message); }
      blueprint = await openaiService.generateBlueprint(intentExpansion?.enriched_query || compositeQuery, { provider });
      if(intentExpansion) blueprint.intent_expansion = intentExpansion;

      // Heuristique anti-généricité: si titres d'articles trop génériques, regénère un bloc sample_content enrichi
      try {
        const articles = blueprint?.sample_content?.articles || [];
        const genericTitles = articles.filter(a=> /Article \d+|Hello World|Mon Site/i.test(a.title||''));
        if(genericTitles.length === articles.length && articles.length){
          const enrichPrompt = `Tu reçois un blueprint JSON partiel pour un site. Ta tâche: RÉÉCRIRE uniquement le champ sample_content.articles avec des titres, slugs, excerpts et body_markdown BEAUCOUP plus spécifiques et différenciants (domaines: technologie, produit SaaS ou niche plausible dérivée de la requête utilisateur). Retourne UNIQUEMENT un JSON: { "sample_content": { "articles": [...] } } avec 3 à 5 articles.
Requête utilisateur initiale: ${effectiveQuery}
Conversation (si dispo): ${conversationSnippet.slice(0,400)}
Blueprint existant (tronqué): ${JSON.stringify({ sample_content: blueprint.sample_content }).slice(0,800)}\nFIN.`;
          // On réutilise generateApplication pour forcer un JSON strict généraliste à 1 clé
          try {
            const enrichRes = await openaiService.generateApplication(enrichPrompt, { maxFiles: 1, provider });
            const sc = enrichRes.sample_content || enrichRes['sample_content.json'] || enrichRes['sample_content'];
            if(sc?.articles){
              blueprint.sample_content.articles = sc.articles;
            }
          } catch(enrichErr){ console.warn('Enrichissement sample_content échoué', enrichErr.message); }
        }
      } catch(enrichOuter){ console.warn('Heuristique enrichissement ignorée', enrichOuter.message); }
    }

    // Construire prompt global à partir du blueprint
    let files = {};
    const selected = selectComponentsForBlueprint(blueprint, 12);
    const catalogSummary = selected.map(c => `${c.name} -> ${c.filename} : ${c.purpose}`).join('\n');
    const validationIssues = {}; // new: collect issues per file

    // Nouvelle stratégie: tentative single-pass globale si non simpleMode
    if(!simpleMode){
      try {
  const { prompt: globalPrompt, capabilities: detectedCaps } = await buildGlobalGenerationPromptAsync(blueprint, selected, { generationProfile });
    const singleResult = await openaiService.generateApplication(globalPrompt, { model: 'gpt-4o-mini', maxFiles: 30, provider });
    if(detectedCaps) blueprint._capability_hits = detectedCaps.map(c=> ({ id:c.id, score:c.score, similarity:c.similarity }));
        // heuristique: si on a au moins 3 fichiers dont +page.svelte ou +layout.svelte, on adopte
        const keys = Object.keys(singleResult||{});
        const hasCore = keys.some(k => k.endsWith('+page.svelte'));
        if (hasCore && keys.length >= 3) {
          files = singleResult;
        }
      } catch(e){
        console.warn('Single-pass global failed, fallback orchestrated', e.message);
      }
    }

    if(simpleMode){
  const appPrompt = buildAppPrompt(blueprint, { simpleMode: true, generationProfile });
    files = await openaiService.generateApplication(appPrompt, { model: 'gpt-4o-mini', maxFiles: 5, provider });
    } else if(Object.keys(files).length === 0) {
      // Ancien mode orchestré seulement si single-pass non satisfaisant
      const perFile = blueprint?.recommended_prompts?.per_file || [];
      if(perFile.length){
        for(const entry of perFile){
          const { filename, prompt: filePrompt } = entry;
          if(!filename || !filePrompt) continue;
          try {
            const context = buildPerFilePrompt({ blueprint, filePrompt, filename, already: files, catalogSummary });
      const result = await openaiService.generateApplication(context, { model: 'gpt-4o-mini', maxFiles: 1, provider });
            // On attend exactement 1 clé (filename attendu). Sinon on tente de récupérer la première.
            if(result[filename]) files[filename] = result[filename];
            else {
              const firstKey = Object.keys(result)[0];
              if(firstKey) files[filename] = result[firstKey]; // remap
            }
            // validate after each per-file generation
            if (files[filename]) {
              const { fixed, issues } = validateAndFix(files[filename], { filename });
              files[filename] = fixed;
              if (issues.length) validationIssues[filename] = issues;
            }
          } catch(e){
            console.warn('Échec génération fichier', filename, e.message);
          }
        }
      }
      // Fallback: si rien généré, utiliser ancien mode global
      if(Object.keys(files).length === 0){
  const fallbackPrompt = buildAppPrompt(blueprint, { simpleMode: false, generationProfile });
    files = await openaiService.generateApplication(fallbackPrompt, { model: 'gpt-4o-mini', maxFiles: 20, provider });
      }
      // Injecter composants validés manquants (si non générés) en ajoutant leur code brut
      for(const comp of selected){
        if(!Object.keys(files).includes(comp.filename)){
          files[comp.filename] = comp.code;
          const { fixed, issues } = validateAndFix(files[comp.filename], { filename: comp.filename });
          files[comp.filename] = fixed;
          if (issues.length) validationIssues[comp.filename] = issues;
        }
      }
    }
    // S'assurer présence d'une page principale (après les deux modes)
    if(!files['src/routes/+page.svelte']){
      const candidate = Object.keys(files).find(k => k.startsWith('src/routes/') && k.endsWith('+page.svelte'));
      if(candidate){
        files['src/routes/+page.svelte'] = files[candidate];
      } else {
        files['src/routes/+page.svelte'] = `<script>/* page principale injectée */</script><div class='p-8 text-center text-gray-600'>Page principale non définie dans blueprint.</div>`;
      }
    }
    // Layout moderne automatique si blueprint.layout_plan.has_layout mais fichier absent
    const wantsLayout = blueprint?.layout_plan?.has_layout;
    if(wantsLayout && !files['src/routes/+layout.svelte']){
      files['src/routes/+layout.svelte'] = `<script>import LanguageSwitcher from '../lib/components/LanguageSwitcher.svelte';</script>
<div class="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">
  <header class="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3 font-semibold tracking-tight">
        <span class="w-8 h-8 rounded bg-indigo-600 text-white grid place-items-center text-sm shadow">AI</span>
        <a href="/" class="hover:text-indigo-600 transition-colors">{import.meta.env?.VITE_APP_NAME || 'Site'}</a>
      </div>
      <nav class="flex items-center gap-6 text-sm">
        <a href="/" class="hover:text-indigo-600">Accueil</a>
        <a href="/blog" class="hover:text-indigo-600">Blog</a>
        <a href="/products" class="hover:text-indigo-600">Produits</a>
        <a href="/invoices" class="hover:text-indigo-600">Factures</a>
        <LanguageSwitcher />
      </nav>
    </div>
  </header>
  <main class="flex-1">
    <slot />
  </main>
  <footer class="mt-12 border-t border-slate-200 bg-white/60 backdrop-blur">
    <div class="max-w-7xl mx-auto px-4 py-8 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
      <p>&copy; {new Date().getFullYear()} - Généré. Tous droits réservés.</p>
      <div class="flex gap-3"><a href="/legal" class="hover:text-indigo-600">Mentions</a><a href="/privacy" class="hover:text-indigo-600">Confidentialité</a></div>
    </div>
  </footer>
</div>`;
    }
    // Thème CSS variables (tokens) si absent
    if(!files['src/lib/theme/tokens.css']){
      files['src/lib/theme/tokens.css'] = `/* Design tokens générés */\n:root{\n  --radius-sm:4px;\n  --radius-md:8px;\n  --radius-lg:16px;\n  --shadow-sm:0 1px 2px rgba(0,0,0,0.05);\n  --shadow-md:0 4px 8px -2px rgba(0,0,0,0.08);\n}\n/* Palette dynamique (peut être enrichie côté client) */\n/* Utilisation: bg-[var(--c0)] etc. */\n`;
      const palette = (blueprint.design_tokens?.colors)||[];
      if(palette.length){
        files['src/lib/theme/tokens.css'] += ':root{'+palette.map((c,i)=>`--c${i}:${c};`).join('')+'}';
      }
    }
    // global validation pass for all files (ensure even simpleMode gets it)
    for (const k of Object.keys(files)) {
      const { fixed, issues } = validateAndFix(files[k], { filename: k });
      files[k] = fixed;
      if (issues.length) {
        validationIssues[k] = Array.from(new Set([...(validationIssues[k]||[]), ...issues]));
      }
    }

    // Mise à jour / création projet
    if (!project && !ephemeral) {
      try {
        const insertData = {
          name: blueprint.seo_meta?.title?.slice(0,60) || 'Projet sans nom',
          original_query: blueprint.original_query || query,
          blueprint_json: blueprint,
          code_generated: files,
          status: 'draft',
          user_id: userId
        };
        if(locals.user?.id) insertData.owner_id = locals.user.id;
        const { data:created, error:insErr } = await clientSupabase.from('projects').insert(insertData).select().single();
        if (insErr) throw insErr;
        project = created;
      } catch(dbInsErr){
        if(/relation .* does not exist/i.test(dbInsErr.message||'')){
          console.warn('[site/generate] Tables absentes lors insert, fallback éphémère.');
          ephemeral = true; project = null;
        } else throw dbInsErr;
      }
    } else if(project && !ephemeral) {
      try {
        const { error:updErr } = await clientSupabase.from('projects').update({ blueprint_json: blueprint, code_generated: files }).eq('id', project.id);
        if (updErr) throw updErr;
      } catch(dbUpdErr){
        if(/relation .* does not exist/i.test(dbUpdErr.message||'')){
          console.warn('[site/generate] Table projects absente lors update, fallback éphémère.');
          ephemeral = true; project = null;
        } else throw dbUpdErr;
      }
    }

    // Stocker chaque fichier dans project_files (upsert pour idempotence)
    if(!ephemeral && project){
      try {
        const fileEntries = Object.entries(files || {});
        for (const [filename, content] of fileEntries) {
          await clientSupabase.from('project_files').upsert({ project_id: project.id, filename, content, stage: 'final', pass_index: 0 }, { onConflict: 'project_id,filename' });
        }
      } catch(dbFileErr){
        if(/relation .* does not exist/i.test(dbFileErr.message||'')){
          console.warn('[site/generate] Table project_files absente, désactivation persistance fichiers.');
          ephemeral = true; // on passe en ephemeral mais on continue à retourner la génération
        } else throw dbFileErr;
      }
    }

    // --- AUTO SELF-REFINE (Phase A) ---
    // Heuristique: si >5 fichiers avec issues ou palette incohérente -> passage refine rapide en mémoire puis persistance
    const issueFiles = Object.keys(validationIssues).length;
    if(!simpleMode && issueFiles > 5 && !ephemeral){
      let criticalCount = 0; let nonCriticalOver = 0; let accessibilityBonus = 0;
      const blueprintPalette = blueprint.color_palette || [];
      for(const [fname, content] of Object.entries(files)){
        let current = content; const aggregatedIssues = [];
        const { fixed, issues, critical } = validateAndFix(current, { filename: fname });
        current = fixed; aggregatedIssues.push(...issues); if(critical) criticalCount++; if(issues.length>3 && !critical) nonCriticalOver++;
        if(blueprintPalette.length){
          const { content: c2, replacements } = unifyPalette(current, blueprintPalette);
          if(replacements){ current = c2; aggregatedIssues.push(`Palette normalized (${replacements})`); }
        }
        const { content: c3, issues: accIssues } = addAccessibilityFixes(current);
        if(accIssues.length){ current = c3; aggregatedIssues.push(...accIssues); accessibilityBonus += accIssues.includes('Added empty alt to img') ? 1 : 0; }
        if(current !== files[fname]){
          files[fname] = current;
          await clientSupabase.from('project_files').upsert({ project_id: project.id, filename: fname, content: current, stage: 'refined-auto', pass_index: 1 }, { onConflict: 'project_id,filename' });
        }
      }
      let score = 100 - criticalCount*5 - nonCriticalOver*1 + Math.min(5, accessibilityBonus);
      if(score<0) score=0; if(score>100) score=100;
      try {
        await clientSupabase.from('projects').update({ code_generated: files, last_auto_refine_score: score }).eq('id', project.id);
      } catch(dbRefineErr){ console.warn('[site/generate] update refine ignoré:', dbRefineErr.message); }

      // Régénération ciblée (max 2 fichiers) si score < 85
      if(score < 85){
        const problematic = Object.entries(validationIssues)
          .sort((a,b)=> (b[1].length) - (a[1].length))
          .slice(0,2)
          .map(e=> e[0]);
        for(const fname of problematic){
          try {
            const regenPrompt = `Améliore ce fichier Svelte pour cohérence design tokens (palette fournie), accessibilité et structure Tailwind moderne.
Palette: ${(blueprint.design_tokens?.colors||[]).join(', ')}
Rappels: un seul <h1> global, classes Tailwind concises, réutilise variables éventuelles.
Retourne JSON: { "${fname}": "CONTENU" }
Ancienne version:
` + files[fname].slice(0,4000);
            const regenRes = await openaiService.generateApplication(regenPrompt, { model: 'gpt-4o-mini', maxFiles: 1 });
            if(regenRes[fname]){
              const { fixed } = validateAndFix(regenRes[fname], { filename: fname });
              files[fname] = fixed;
              await clientSupabase.from('project_files').upsert({ project_id: project.id, filename: fname, content: fixed, stage: 'refined-regen', pass_index: 2 }, { onConflict: 'project_id,filename' });
            }
          } catch(err){ console.warn('Targeted regen failed', fname, err.message); }
        }
  try { await clientSupabase.from('projects').update({ code_generated: files }).eq('id', project.id); } catch(eu){ console.warn('[site/generate] update post-regen échoué:', eu.message); }
      }
    }

  const capabilities = blueprint._capability_hits || [];
  // === PHASE: COMPILATION SSR pour validation réelle ===
  const compileResults = {};
  for(const [fname, content] of Object.entries(files)){
    if(!fname.endsWith('.svelte')) continue;
    try {
      const c = compile(content, { generate: 'ssr', css: false });
      // tester render
      try {
        const fn = new Function('require','module','exports', c.js.code);
        const mod = { exports: {} };
        fn((n)=> (n==='svelte/internal'? require('svelte/internal'): require(n)), mod, mod.exports);
        const Comp = mod.exports.default || mod.exports;
        if(!Comp?.render) throw new Error('render() manquant');
        const { html='' } = Comp.render({});
        compileResults[fname] = { ok:true, bytes: content.length, snippet: html.slice(0,180) };
      } catch(e){
        compileResults[fname] = { ok:false, stage:'execute', error: e.message };
      }
    } catch(e){
      compileResults[fname] = { ok:false, stage:'compile', error: e.message };
    }
  }
  // Validation ESLint/Prettier/Compile unifiée (nouvelle) pour chaque fichier
  let fullValidation = null;
  try {
    fullValidation = await validateFiles(files);
    // Embeddings: upsert chaque fichier validé OK
    for(const [filename, val] of Object.entries(fullValidation)){
      // Svelte-check: fusionne diagnostics
      if(filename.endsWith('.svelte')){
        try {
          const sc = await runSvelteCheckSnippet(filename, val.formatted || val.original, { timeoutMs: 4000 });
          if(sc.diagnostics?.length){
            const seen = new Set(val.diagnostics.map(d=>d.source+'|'+d.message+'|'+d.line));
            for(const d of sc.diagnostics){
              const key = d.source+'|'+d.message+'|'+d.line;
              if(!seen.has(key)){ val.diagnostics.push(d); seen.add(key); }
            }
          }
        } catch(e){ /* ignore */ }
      }
      if(val.diagnostics.filter(d=>d.severity==='error').length===0){
        if(process.env.DATABASE_URL){
          try {
            await upsertSnippet({ path: filename, content: val.formatted || val.original, kind: filename.endsWith('.svelte')?'component':'other', language: filename.endsWith('.svelte')?'svelte':'js' });
          } catch(e){ /* ignore embeddings failure */ }
        }
      }
    }
  } catch(e){
    console.warn('validateFiles global failed', e.message);
  }
  try {
    if(!ephemeral){
      await clientSupabase.from('generation_logs').insert({
        user_id: project?.owner_id || project?.user_id || userId || null,
        project_id: project?.id || null,
        type: 'generation',
        pass_count: 1,
        duration_ms: null,
        meta: { file_count: Object.keys(files).length, simpleMode: !!simpleMode }
      });
    }
  } catch(e){ /* ignore logs errors */ }
  return json({ success:true, blueprint, files, project: project || null, ephemeral, orchestrated: !simpleMode, validationIssues, validation: fullValidation, singlePass: Object.keys(files).length>0, capabilities, compileResults });
  } catch (err) {
    console.error('site/generate error', err);
    return json({ success:false, error:err.message }, { status:500 });
  }
}

function buildAppPrompt(blueprint, { simpleMode, generationProfile = 'safe' } = {}){
  const { routes = [], core_components = [], color_palette = [], sample_content = {}, seo_meta = {} } = blueprint || {};
  const articles = sample_content.articles || [];
  if(simpleMode){
    return `Génère un site SvelteKit ULTRA SIMPLE en UN SEUL FICHIER.
Contraintes STRICTES:
- Uniquement le fichier src/routes/+page.svelte dans le JSON final (pas d'autres clés)
- Pas de <script> ni d'import local; uniquement du markup statique + classes Tailwind
- Le fichier doit contenir: un header de navigation, une section hero, jusqu'à 3 sections de contenu, éventuellement une grille d'articles, et un footer.
- Le style repose exclusivement sur Tailwind CDN (le sandbox l'injectera)
- Pas de logique dynamique, pas de formulaires complexes
- AUCUN texte hors JSON, pas de commentaires.
Contexte:
Routes prévues: ${routes.map(r=>r.path).join(', ') || '/'}
Palette: ${color_palette.join(', ')}
Titre SEO: ${seo_meta.title}
Articles disponibles: ${articles.slice(0,4).map(a=>a.title).join(' | ')}
Retourne JSON: {"src/routes/+page.svelte":"CONTENU"}`.trim();
  }
  // Construction des fichiers attendus à partir des routes + composants
  const routeFileMappings = routes.map(r => {
    const p = r.path || '/';
    if(p === '/' || p === '') return 'src/routes/+page.svelte';
    // dynamique : /articles/:slug
    const segs = p.split('/').filter(Boolean).map(seg => seg.startsWith(':') ? `[${seg.slice(1)}]` : seg);
    return 'src/routes/' + segs.join('/') + '/+page.svelte';
  });
  const uniqueRoutes = Array.from(new Set(routeFileMappings));
  const componentFiles = (core_components || []).map(name => {
    const safe = name.replace(/[^A-Za-z0-9]/g,'');
    return `src/lib/components/${safe}.svelte`;
  });
  const expectedFiles = [...uniqueRoutes, ...componentFiles].slice(0, 20);
  const catalogSummary = summarizeCatalog();
  const profileBlock = generationProfile === 'external_libs'
    ? `MODE: external_libs autorisées (chart.js, @tanstack/table-core) – UNIQUEMENT si utilisées.`
    : generationProfile === 'enhanced'
      ? `MODE: enhanced (structure optimisée, zéro dépendance externe).`
      : `MODE: safe (strict, aucune dépendance externe).`;
  return `Crée une application SvelteKit multi-fichiers.
${profileBlock}
Contexte:
Routes: ${routes.map(r=> r.path+ ' => '+ (r.sections||[]).join(',')).join(' | ')}
Composants: ${core_components.join(', ')}
Palette: ${color_palette.join(', ')}
SEO Title: ${seo_meta.title}
Articles: ${articles.map(a=> a.slug).join(', ')}
Catalogue de composants validés (à RÉUTILISER, pas réécrire) :\n${catalogSummary}\n
Objectif: Générer les fichiers Svelte suivants (clés JSON): ${expectedFiles.join(', ')}. Tu peux aussi ajouter README.md, package.json, tailwind.config.cjs, postcss.config.cjs, src/app.css si utiles.
Contraintes STRICTES:
- Retourne UNIQUEMENT un objet JSON (pas de markdown, pas de texte hors JSON)
- Chaque clé = chemin fichier relatif
- Pas de commentaires hors code
- Les fichiers .svelte doivent être valides et utiliser Tailwind pour le style
- Réutiliser Header/Footer/Hero/ArticleCard/CommentSection
- Pour la page dynamique, inclure un exemple d'affichage d'un article (données mock locales)
- Fournir contenu pertinent dans chaque route
- Max 20 fichiers, prioriser ceux listés
- Si MODE external_libs: inclure package.json avec seulement chart.js et/ou @tanstack/table-core SI un composant démontre leur usage, sinon ne pas les ajouter
FIN.`.trim();
}

// Construit un prompt dédié à un fichier unique en intégrant contexte blueprint + fichiers déjà générés.
function buildPerFilePrompt({ blueprint, filePrompt, filename, already, catalogSummary }){
  const { seo_meta = {}, color_palette = [], routes = [], core_components = [] } = blueprint || {};
  const previousList = Object.keys(already||{}).slice(-6); // limiter contexte
  return `Tu génères UNIQUEMENT le fichier Svelte suivant: ${filename}.
Contexte site:
Titre: ${seo_meta.title}
Palette: ${color_palette.join(', ')}
Routes: ${routes.map(r=> r.path).join(', ')}
Composants à réutiliser si utiles: ${core_components.join(', ')}
Catalogue validé:\n${catalogSummary}\n
Fichiers déjà générés (référence uniquement, ne pas les réécrire): ${previousList.join(', ') || 'aucun'}
Instruction spécifique:
${filePrompt}
Contraintes STRICTES:
- Retourne JSON: { "${filename}": "CONTENU" }
- Pas de texte hors JSON
- Pas de commentaires superflus
- Utilise Tailwind pour la mise en page
- Si le fichier est une page article dynamique, inclure données mock locales.
FIN.`.trim();
}

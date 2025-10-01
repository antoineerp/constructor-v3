import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

import { computeFileHash, getCached, setCached } from '$lib/preview/compileCache.js';
import { supabase as clientSupabase, isSupabaseEnabled } from '$lib/supabase.js';
import { 
  SECURITY_CONFIG, 
  validateSourceSecurity, 
  withTimeout, 
  createRestrictedRequire,
  secureLog 
} from '$lib/security/validation.js';

// GET /api/projects/:id/preview
// Retourne un rendu SSR HTML du fichier d'entrée (src/routes/+page.svelte) du code généré.
// Objectif: fournir un aperçu rapide avec Tailwind (classes présentes) sans hydrater pour l'instant.
export async function GET(event){
  const { params, url, locals } = event;
  const projectId = params.id;
  const fileParam = url.searchParams.get('file');
  
  if(!projectId) return json({ success:false, error:'projectId manquant' }, { status:400 });
  
  // 🔒 Vérification de sécurité globale
  if (!SECURITY_CONFIG.SSR_ENABLED) {
    return json({ 
      success: false, 
      error: 'SSR preview disabled for security reasons in production',
      alternative: 'Use /api/projects/:id/compile for client-side rendering'
    }, { status: 503 });
  }
  
  try {
    // Récupération projet
    let files;
    if(isSupabaseEnabled){
      const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
      if(locals.user?.id) queryBuilder.eq('user_id', locals.user.id);
      const { data: project, error } = await queryBuilder.single();
      if(error) throw error;
      if(!project?.code_generated){
        return json({ success:false, error:'Aucun code généré pour ce projet' }, { status:404 });
      }
      files = project.code_generated;
    } else {
      files = {
        'src/routes/+page.svelte': `<h1 class="text-2xl font-bold text-indigo-600">Demo Offline</h1><p class="text-sm text-gray-600">Preview SSR sans Supabase.</p>`,
        'src/routes/blog/+page.svelte': `<h2 class="text-xl font-semibold text-purple-600">Blog</h2><p class="text-xs text-gray-500">Page blog fallback (offline).</p>`
      };
    }
    // Filtrer seulement les routes .svelte (heuristique)
    const svelteFiles = Object.keys(files).filter(f=> f.endsWith('.svelte'));
    if(!svelteFiles.length) return json({ success:false, error:'Aucun fichier Svelte présent' }, { status:404 });
    // Liste des routes probables: chemins sous src/routes
    const routeCandidates = svelteFiles.filter(f=> f.startsWith('src/routes/'));
    let entry = fileParam && files[fileParam] ? fileParam : 'src/routes/+page.svelte';
    if(!files[entry]) entry = routeCandidates.find(r=> /\+page\.svelte$/.test(r)) || svelteFiles[0];
    const source = files[entry];
    const cacheKey = computeFileHash(entry, source, { variant:'ssr-html' });
    const cached = getCached(cacheKey);
    // Inject quality meta (dernière génération)
    let quality = null; let validation_summary = null;
    try {
      const { data: logs } = await clientSupabase.from('generation_logs')
        .select('meta')
        .eq('project_id', projectId)
        .order('created_at', { ascending:false })
        .limit(1);
      if(logs && logs.length){
        quality = logs[0].meta?.quality || null;
        validation_summary = logs[0].meta?.validation_summary || null;
      }
    } catch(e){ 
      secureLog('warn', 'preview/quality', { 
        projectId, 
        error: e.message, 
        timestamp: new Date().toISOString() 
      }); 
    }
    
    if(cached){
      return json({ success:true, entry, html: cached.html, fileCount: svelteFiles.length, routes: routeCandidates, cached:true, quality, validation_summary });
    }
    
    let html = '';
    try {
      // 🛡️ VALIDATION DE SÉCURITÉ OBLIGATOIRE
      validateSourceSecurity(source, entry);
      
      // Compilation Svelte sécurisée
      const c = compile(source, { 
        generate:'ssr', 
        css:'external', 
        filename: entry, 
        runes: false, 
        compatibility: { componentApi: 4 } 
      });
      
      // 🔒 RENDU SSR SÉCURISÉ AVEC SANDBOX BASIQUE
      // Note: En production, ceci devrait être dans un Worker isolé
      const module = { exports: {} };
      
      // Utiliser le require restreint centralisé
      const restrictedRequire = createRestrictedRequire();
      
      // Exécution avec environnement restreint
      const fn = new Function('require','module','exports', c.js.code);
      fn(restrictedRequire, module, module.exports);
      
      const Comp = module.exports.default || module.exports;
      if(Comp?.render){
        // 🕒 Rendu avec timeout strict utilisant l'utilitaire centralisé
        html = await withTimeout(
          Promise.resolve().then(() => {
            const result = Comp.render({});
            return result.html || '';
          }),
          SECURITY_CONFIG.SSR_TIMEOUT_MS,
          'SSR render timeout exceeded'
        );
      } else {
        html = '<!-- Component render method not found -->';
      }
      
    } catch(e){
      secureLog('error', 'preview/ssr', {
        projectId,
        entry,
        error: e.message,
        stack: e.stack,
        timestamp: new Date().toISOString()
      });
      
      // Retour d'erreur sécurisé (pas de stack trace en production)
      const errorMsg = process.env.NODE_ENV === 'development' 
        ? `SSR failed: ${e.message}` 
        : 'Preview compilation failed';
        
      return json({ success:false, error: errorMsg }, { status: 500 });
    }
    // 🧹 Sanitisation basique du HTML rendu (déjà échappé par Svelte normalement)
    const safeHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed -->');
    
    // Wrapper pour visualisation isolée
    const wrapped = `<div class="preview-root">${safeHtml}</div>`;
    
    // Cache avec TTL plus court pour sécurité
    setCached(cacheKey, { html: wrapped }, 30*1000); // 30s cache SSR
    
    console.log('[preview/ssr] Success:', {
      projectId,
      entry,
      htmlLength: wrapped.length,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
    return json({ 
      success:true, 
      entry, 
      html: wrapped, 
      fileCount: svelteFiles.length, 
      routes: routeCandidates, 
      cached:false, 
      quality, 
      validation_summary,
      security: 'validated' // Indicateur de sécurisation
    });
    
  } catch(e){
    console.error('[preview/global] Unexpected error:', {
      projectId,
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const errorMsg = process.env.NODE_ENV === 'development' 
      ? e.message 
      : 'Internal server error';
      
    return json({ success:false, error: errorMsg }, { status:500 });
  }
}

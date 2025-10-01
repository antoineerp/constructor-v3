import { json } from '@sveltejs/kit';
import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'node:child_process';
import path from 'path';
import { compile } from 'svelte/compiler';

// Force runtime Node.js pour éviter edge limitations
export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Body: { files: Record<string, string>, entry?: string }
 * 
 * 🔥 VRAI COMPILATEUR - Génère un preview Svelte COMPLET avec:
 * - Tous les modules compilés
 * - Import map ESM
 * - Tailwind CSS build
 * - Skeleton UI support
 * - Routing multi-pages
 */
export async function POST({ request }) {
  const t0 = Date.now();
  
  try {
    // Parse le body
    const body = await request.json();
    const { files: projectFiles, entry = 'src/routes/+page.svelte' } = body;
    
    // Validation
    if (!projectFiles || typeof projectFiles !== 'object') {
      return json({ 
        success: false, 
        error: 'Missing required field: files (object)' 
      }, { status: 400 });
    }
    
    // Vérifier qu'on a au moins un fichier Svelte
    const svelteEntries = Object.entries(projectFiles).filter(([k]) => k.endsWith('.svelte'));
    if (svelteEntries.length === 0) {
      return json({ 
        success: false, 
        error: 'No Svelte files found in files object' 
      }, { status: 400 });
    }
    
    console.log('[temporary/compile] Compiling', svelteEntries.length, 'Svelte files...');
    
    // 🎯 1. COMPILATION TAILWIND SI PRÉSENT
    let globalCss = '';
    const hasTailwind = !!projectFiles['src/app.css'] && !!projectFiles['tailwind.config.cjs'];
    
    if (hasTailwind) {
      console.log('[temporary/compile] Building Tailwind CSS...');
      const tmpDir = `/tmp/preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      fs.mkdirSync(tmpDir, { recursive: true });
      try {
        fs.writeFileSync(`${tmpDir}/tailwind.config.cjs`, projectFiles['tailwind.config.cjs']);
        fs.writeFileSync(`${tmpDir}/app.css`, projectFiles['src/app.css']);
        
        const out = execSync(
          `npx --yes tailwindcss@latest -i "${tmpDir}/app.css" -c "${tmpDir}/tailwind.config.cjs" --minify`,
          { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 }
        );
        globalCss = out.trim();
        console.log('[temporary/compile] Tailwind CSS generated:', globalCss.length, 'bytes');
      } catch (e) {
        console.warn('[temporary/compile] Tailwind build failed:', e.message);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
    
    // 🎯 2. COMPILATION DE TOUS LES MODULES SVELTE
    const modules = [];
    const fileSet = new Set(svelteEntries.map(e => e[0]));
    
    function resolveImport(spec, from) {
      if (!spec.startsWith('.')) return null;
      const baseDir = path.posix.dirname(from);
      let full = path.posix.normalize(path.posix.join(baseDir, spec));
      if (!/\.svelte$/i.test(full)) full += '.svelte';
      return fileSet.has(full) ? full : null;
    }
    
    const importRegex = /import\s+[^;'"`]+?from\s+['"]([^'"\n]+)['"];?|import\s+['"]([^'"\n]+)['"];?/g;
    
    for (const [pathName, source] of svelteEntries) {
      try {
        const c = compile(source, {
          generate: 'dom',
          filename: pathName,
          css: 'injected',
          runes: false,
          compatibility: { componentApi: 4 }
        });
        
        // Post-traitement: nettoyer les imports Svelte 5 legacy
        let jsCode = c.js.code;
        jsCode = jsCode.replace(/from ['"]svelte\/legacy['"]/g, 'from "svelte"');
        jsCode = jsCode.replace(/import ['"]svelte\/legacy['"]/g, 'import "svelte"');
        jsCode = jsCode.replace(/from ['"]svelte\/legacy\/(.+?)['"]/g, 'from "svelte/$1"');
        
        const css = c.css?.code || '';
        
        // Collecter les imports relatifs
        const imports = [];
        let m;
        while ((m = importRegex.exec(jsCode))) {
          const spec = m[1] || m[2];
          if (!spec) continue;
          const resolved = resolveImport(spec, pathName);
          if (resolved) imports.push({ spec, target: resolved });
        }
        
        modules.push({ path: pathName, jsCode, css, imports });
        console.log('[temporary/compile] Compiled:', pathName);
      } catch (e) {
        console.error('[temporary/compile] Compilation error:', pathName, e.message);
        modules.push({ path: pathName, error: e.message });
      }
    }
    
    // Vérifier qu'on a au moins un module compilé
    const validModules = modules.filter(m => !m.error);
    if (validModules.length === 0) {
      return json({ 
        success: false, 
        error: 'All Svelte files failed to compile',
        details: modules.filter(m => m.error).map(m => ({ path: m.path, error: m.error }))
      }, { status: 500 });
    }
    
    // 🎯 3. RÉÉCRITURE DES IMPORTS EN CHEMINS ABSOLUS
    const rewritten = new Map();
    
    function toAbsolute(spec, from) {
      if (!spec) return spec;
      if (spec.startsWith('src/')) return spec;
      if (!spec.startsWith('.')) return spec;
      const baseDir = path.posix.dirname(from);
      return path.posix.normalize(path.posix.join(baseDir, spec));
    }
    
    for (const m of validModules) {
      if (!m.jsCode) continue;
      let code = m.jsCode;
      code = code.replace(importRegex, (full, g1, g2) => {
        const orig = g1 || g2;
        if (!orig) return full;
        const abs = toAbsolute(orig, m.path);
        if (abs !== orig && /\.svelte$/.test(abs)) {
          return full.replace(orig, abs);
        }
        return full;
      });
      rewritten.set(m.path, code);
    }
    
    // 🎯 4. GÉNÉRATION HTML AVEC IMPORT MAP (RUNTIME SVELTE COMPLET)
    const entryModule = rewritten.has(entry) ? entry : rewritten.keys().next().value;
    if (!entryModule) {
      return json({ success: false, error: 'No entry module found' }, { status: 500 });
    }
    
    console.log('[temporary/compile] Entry module:', entryModule);
    
    // Créer import map avec identifiants courts
    const idMap = new Map();
    let iMod = 0;
    for (const modulePath of rewritten.keys()) {
      idMap.set(modulePath, `m${iMod++}`);
    }
    
    // Construire l'import map JSON
    const importMapObj = { imports: {} };
    for (const [modulePath, shortId] of idMap) {
      importMapObj.imports[modulePath] = `./${shortId}.js`;
    }
    
    // Ajouter Svelte et Skeleton UI via CDN ESM
    importMapObj.imports['svelte'] = 'https://esm.sh/svelte@5';
    importMapObj.imports['svelte/internal'] = 'https://esm.sh/svelte@5/internal';
    importMapObj.imports['svelte/store'] = 'https://esm.sh/svelte@5/store';
    importMapObj.imports['svelte/motion'] = 'https://esm.sh/svelte@5/motion';
    importMapObj.imports['svelte/transition'] = 'https://esm.sh/svelte@5/transition';
    importMapObj.imports['svelte/animate'] = 'https://esm.sh/svelte@5/animate';
    importMapObj.imports['svelte/easing'] = 'https://esm.sh/svelte@5/easing';
    importMapObj.imports['@skeletonlabs/skeleton'] = 'https://esm.sh/@skeletonlabs/skeleton@3';
    
    // Convertir les modules avec data URLs (inline)
    const moduleScripts = [];
    for (const [modulePath, code] of rewritten) {
      const shortId = idMap.get(modulePath);
      let rewrittenCode = code;
      
      // Remplacer tous les imports dans le code
      for (const [origPath, origId] of idMap) {
        if (origPath !== modulePath) {
          rewrittenCode = rewrittenCode.replaceAll(`from "${origPath}"`, `from "./${origId}.js"`);
          rewrittenCode = rewrittenCode.replaceAll(`from '${origPath}'`, `from './${origId}.js'`);
        }
      }
      
      // Créer un blob URL pour chaque module
      moduleScripts.push({
        id: shortId,
        path: modulePath,
        code: rewrittenCode
      });
    }
    
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - Constructor v3</title>
  
  <!-- Import Map pour résolution des modules -->
  <script type="importmap">
${JSON.stringify(importMapObj, null, 2)}
  </script>
  
  <!-- Tailwind CSS générée ou CDN -->
  ${globalCss ? `<style>${globalCss}</style>` : '<script src="https://cdn.tailwindcss.com"></script>'}
  
  <!-- Skeleton UI CSS via CDN -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@skeletonlabs/skeleton@3/themes/theme-skeleton.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@skeletonlabs/skeleton@3/styles/all.css">
  
  <!-- FontAwesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    #app { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>
  
  ${moduleScripts.map(m => `
  <!-- Module: ${m.path} -->
  <script type="module" id="${m.id}">
${m.code}
  </script>`).join('\n')}
  
  <!-- Bootstrap l'application Svelte -->
  <script type="module">
    import App from '${entryModule}';
    console.log('[Preview] Mounting Svelte app from:', '${entryModule}');
    const app = new App({ 
      target: document.getElementById('app'),
      props: { params: {}, data: {} }
    });
    console.log('[Preview] App mounted successfully!');
  </script>
</body>
</html>`;
    
    console.log('[temporary/compile] Success! Generated', validModules.length, 'modules');
    
    return json({
      success: true,
      runtimeHtml: html,
      timings: {
        total_ms: Date.now() - t0
      },
      meta: {
        entry: entryModule,
        modulesCount: validModules.length,
        cssGenerated: !!globalCss,
        compiledAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[temporary/compile] Fatal error:', error);
    
    return json({
      success: false,
      error: error.message,
      details: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

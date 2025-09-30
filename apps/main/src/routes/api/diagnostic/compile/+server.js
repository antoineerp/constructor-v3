import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';
import fs from 'fs';
import path from 'path';

// GET /api/diagnostic/compile
// Endpoint diagnostic pour identifier les problèmes de compilation Svelte
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    svelte: {},
    modules: {},
    runtime: {},
    issues: []
  };

  try {
    // 1. Vérifier la version Svelte - essayer plusieurs emplacements
    try {
      let pkg;
      const possiblePaths = [
        'node_modules/svelte/package.json',
        'node_modules/.ignored/svelte/package.json',
        path.resolve(process.cwd(), 'node_modules/svelte/package.json'),
        path.resolve(process.cwd(), 'apps/main/node_modules/.ignored/svelte/package.json')
      ];
      
      for (const pkgPath of possiblePaths) {
        try {
          pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          diagnostics.svelte.version = pkg.version;
          diagnostics.svelte.name = pkg.name;
          diagnostics.svelte.resolvedPath = pkgPath;
          break;
        } catch(e) {
          continue;
        }
      }
      
      if (!pkg) {
        diagnostics.issues.push('Cannot find svelte package.json in any known location');
      }
    } catch(e) {
      diagnostics.issues.push('Cannot read svelte package.json: ' + e.message);
    }

    // 2. Vérifier les modules internes disponibles - avec les bons chemins
    const internalPaths = [
      'node_modules/.ignored/svelte/src/internal/client/index.js',
      'node_modules/.ignored/svelte/src/internal/index.js', 
      'node_modules/.ignored/svelte/src/internal/disclose-version.js',
      'node_modules/svelte/src/internal/client/index.js',
      'node_modules/svelte/src/internal/index.js',
      'node_modules/svelte/src/internal/disclose-version.js'
    ];

    diagnostics.modules.available = {};
    for(const p of internalPaths) {
      try {
        const fullPath = path.resolve(p);
        diagnostics.modules.available[p] = {
          exists: fs.existsSync(fullPath),
          size: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0
        };
      } catch(e) {
        diagnostics.modules.available[p] = { exists: false, error: e.message };
      }
    }

    // 3. Test de compilation simple
    const testCode = `<script>let count = 0;</script><h1>Test {count}</h1><button on:click={() => count++}>+</button>`;
    
    try {
      const compiled = compile(testCode, { 
        generate: 'dom', 
        filename: 'Test.svelte',
        css: 'injected',
        dev: false 
      });
      
      diagnostics.runtime.simpleCompile = {
        success: true,
        jsSize: compiled.js.code.length,
        cssSize: compiled.css?.code?.length || 0,
        hasImports: /import\s/.test(compiled.js.code)
      };

      // Analyser les imports générés
      const imports = [];
      const importRegex = /import\s+[^;]+?from\s+['"]([^'"\n]+)['"];?/g;
      let m;
      while((m = importRegex.exec(compiled.js.code))) {
        imports.push(m[1]);
      }
      diagnostics.runtime.detectedImports = imports;

    } catch(e) {
      diagnostics.runtime.simpleCompile = {
        success: false,
        error: e.message
      };
      diagnostics.issues.push('Simple compilation failed: ' + e.message);
    }

    // 4. Test compilation SSR
    try {
      const ssrCompiled = compile(testCode, { 
        generate: 'ssr', 
        filename: 'Test.svelte'
      });
      
      diagnostics.runtime.ssrCompile = {
        success: true,
        jsSize: ssrCompiled.js.code.length
      };
    } catch(e) {
      diagnostics.runtime.ssrCompile = {
        success: false,
        error: e.message  
      };
      diagnostics.issues.push('SSR compilation failed: ' + e.message);
    }

    // 5. Vérifier les variables globales de cache
    diagnostics.runtime.globalState = {
      compileRequests: globalThis.__COMPILE_REQS || 0,
      runtimeBundles: globalThis.__RUNTIME_BUNDLES?.size || 0,
      tailwindCache: globalThis.__TAILWIND_CSS_CACHE?.size || 0
    };

    // 6. Résumé des problèmes
    if(diagnostics.issues.length === 0) {
      diagnostics.status = 'healthy';
    } else {
      diagnostics.status = 'issues_detected';
    }

    return json(diagnostics);

  } catch(e) {
    return json({
      ...diagnostics,
      status: 'error',
      error: e.message,
      stack: e.stack
    }, { status: 500 });
  }
}
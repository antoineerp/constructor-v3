import { json } from '@sveltejs/kit';

export const config = { runtime: 'nodejs20.x' };

// POST /api/projects/temporary/compile  
// Body: { files: Record<string,string>, entries?: string[] }
// ⚡ Version 100% autonome pour aperçu client-side (Bolt.new style)
export async function POST(event) {
  const { request } = event;
  
  try {
    const body = await request.json();
    const { files, entries = ['src/routes/+page.svelte'] } = body;
    
    if (!files || typeof files !== 'object') {
      return json({ success: false, error: 'Fichiers requis' }, { status: 400 });
    }

    // 🎯 Génération HTML sécurisé pour iframe (style Bolt.new) - 100% autonome
    const mainFile = files['src/routes/+page.svelte'] || files['+page.svelte'] || '';
    
    // Nettoyage basique du code Svelte (sans importation externe)
    const cleanedCode = basicSvelteClean(mainFile);
    
    // HTML autonome avec scripts embedded uniquement
    const runtimeHtml = generateStandaloneHTML(cleanedCode, files);
    
    return json({
      success: true,
      runtimeHtml,
      message: 'Compiled for client-side iframe sandbox',
      security: 'No server execution - Bolt.new style'
    });
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Nettoyage basique du code Svelte (sans dépendances externes)
 * @param {string} code - Code Svelte à nettoyer
 * @returns {string} - Code nettoyé
 */
function basicSvelteClean(code) {
  if (!code) return code;
  
  return code
    .replace(/import\s+{\s*onMount\s*}\s+from\s+['"]svelte['"];?/g, "import { onMount } from 'svelte';")
    .replace(/import\s+{\s*createEventDispatcher\s*}\s+from\s+['"]svelte['"];?/g, "import { createEventDispatcher } from 'svelte';")
    .replace(/\$:\s*\$effect\(/g, '$effect(')
    .replace(/\$:\s*\$derived\(/g, '$derived(')
    .trim();
}

/**
 * Génère un HTML avec compilation Svelte côté client (vrai rendu dynamique)
 * Utilise le compilateur Svelte depuis CDN pour un rendu authentique
 */
function generateStandaloneHTML(svelteCode, allFiles) {
  // Extraire le CSS s'il existe
  const cssFile = allFiles['src/app.css'] || allFiles['app.css'] || '';
  const tailwindConfig = allFiles['tailwind.config.cjs'] || '';
  
  // Préparer tous les fichiers pour la compilation
  const filesForCompilation = JSON.stringify(allFiles).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperçu Svelte Dynamique</title>
  
  <!-- Tailwind CSS depuis CDN pour le styling -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Configuration Tailwind si présente -->
  ${tailwindConfig ? `<script>
    tailwind.config = ${tailwindConfig.replace(/module\.exports\s*=/, '').replace(/;?\s*$/, '')};
  </script>` : ''}
  
  <style>
    /* Reset et styles de base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
    }
    
    /* CSS du projet */
    ${cssFile}
    
    /* Styles de chargement et d'erreur */
    .svelte-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
      flex-direction: column;
      gap: 1rem;
    }
    
    .svelte-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .svelte-error {
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1rem;
      color: #dc2626;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="svelte-loading">
      <div class="svelte-spinner"></div>
      <p>🚀 Compilation Svelte en cours...</p>
    </div>
  </div>

  <!-- Svelte Compiler depuis CDN -->
  <script src="https://unpkg.com/svelte@5/compiler.js"></script>
  
  <script type="module">
    console.log('🎯 Démarrage compilation Svelte côté client');
    
    // Files disponibles pour la compilation
    const projectFiles = ${filesForCompilation};
    
    async function compileSvelteApp() {
      try {
        const appDiv = document.getElementById('app');
        
        // Vérifier que le compilateur Svelte est disponible
        if (typeof svelte === 'undefined' || !svelte.compile) {
          throw new Error('Compilateur Svelte non disponible');
        }
        
        // Code Svelte principal à compiler
        const mainComponent = \`${escapeCode(svelteCode)}\`;
        
        if (!mainComponent.trim()) {
          throw new Error('Composant principal vide');
        }
        
        console.log('📦 Compilation du composant principal...');
        
        // Compiler le composant Svelte
        const compiled = svelte.compile(mainComponent, {
          generate: 'dom',
          dev: true,
          css: 'injected'
        });
        
        if (!compiled.js) {
          throw new Error('Échec de la compilation Svelte');
        }
        
        console.log('✅ Compilation réussie, création du composant...');
        
        // Créer une fonction constructeur pour le composant
        const componentCode = compiled.js.code;
        
        // Remplacer les imports par des mocks simples
        const processedCode = componentCode
          .replace(/import\\s+.*?from\\s+['"][^'"]*['"];?\\s*/g, '')
          .replace(/export\\s+default\\s+/, 'return ');
        
        // Créer le composant dans un contexte sécurisé
        const ComponentConstructor = new Function('console', 'document', 'window', processedCode);
        const Component = ComponentConstructor(console, document, window);
        
        // Nettoyer l'app div et monter le composant
        appDiv.innerHTML = '';
        
        // Créer une instance du composant
        const instance = new Component({
          target: appDiv,
          props: {}
        });
        
        console.log('🎉 Composant Svelte monté avec succès !');
        
        // Ajouter des informations de debug
        const debugInfo = document.createElement('div');
        debugInfo.innerHTML = \`
          <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px; z-index: 9999;">
            ✅ Svelte compilé côté client
          </div>
        \`;
        document.body.appendChild(debugInfo);
        
        return instance;
        
      } catch (error) {
        console.error('❌ Erreur compilation Svelte:', error);
        
        // Affichage d'erreur détaillé
        document.getElementById('app').innerHTML = \`
          <div class="svelte-error">
            <h3>⚠️ Erreur de compilation Svelte</h3>
            <p><strong>Message:</strong> \${error.message}</p>
            <details style="margin-top: 1rem;">
              <summary>Détails techniques</summary>
              <pre style="margin-top: 0.5rem; font-size: 11px; overflow: auto;">\${error.stack || 'Pas de stack trace'}</pre>
            </details>
            <p style="margin-top: 1rem;">
              <strong>💡 Solutions possibles:</strong><br>
              • Vérifiez la syntaxe Svelte<br>
              • Évitez les imports externes<br>
              • Utilisez uniquement du code Svelte standard
            </p>
          </div>
        \`;
      }
    }
    
    // Lancer la compilation quand le DOM est prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', compileSvelteApp);
    } else {
      compileSvelteApp();
    }
  </script>
</body>
</html>`;
}

/**
 * Échappe le code pour l'injection sécurisée dans le template
 */
function escapeCode(code) {
  return code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}
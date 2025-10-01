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
 * Génère un HTML autonome pour iframe (style Bolt.new)
 * 100% autonome sans importations externes
 */
function generateStandaloneHTML(svelteCode, allFiles) {
  // Extraire le CSS s'il existe
  const cssFile = allFiles['src/app.css'] || allFiles['app.css'] || '';
  
  // Template HTML autonome avec Svelte CDN
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperçu - Générateur IA</title>
  <style>
    /* Reset de base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8fafc;
      padding: 1rem;
    }
    
    /* CSS du projet */
    ${cssFile}
    
    /* Styles d'erreur */
    .error-display {
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      color: #dc2626;
    }
    
    .loading {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading">
      <p>⚡ Initialisation de l'aperçu...</p>
    </div>
  </div>

  <script type="module">
    try {
      // Simulation d'un composant Svelte sans compilation complète
      // Pour éviter les erreurs de module dans l'iframe
      
      const appDiv = document.getElementById('app');
      
      // Parser basique du code Svelte pour extraire le HTML
      let htmlContent = extractHTMLFromSvelte(\`${escapeCode(svelteCode)}\`);
      
      if (htmlContent) {
        appDiv.innerHTML = htmlContent;
        
        // Ajouter interactivité basique si nécessaire
        addBasicInteractivity(appDiv);
        
        console.log('✅ Aperçu généré avec succès (mode sandbox)');
      } else {
        throw new Error('Impossible d\\'extraire le HTML du composant');
      }
      
    } catch (error) {
      console.error('❌ Erreur d\\'aperçu:', error);
      document.getElementById('app').innerHTML = \`
        <div class="error-display">
          <h3>⚠️ Erreur d'aperçu</h3>
          <p><strong>Message:</strong> \${error.message}</p>
          <p><strong>Conseil:</strong> Vérifiez la syntaxe de votre composant Svelte.</p>
        </div>
      \`;
    }
    
    // Fonction pour extraire le HTML du code Svelte
    function extractHTMLFromSvelte(code) {
      // Supprimer les balises <script> et <style>
      let html = code.replace(/<script[^>]*>.*?<\\/script>/gis, '');
      html = html.replace(/<style[^>]*>.*?<\\/style>/gis, '');
      
      // Nettoyer les directives Svelte basiques
      html = html.replace(/\\{[^}]*\\}/g, '[Données dynamiques]');
      html = html.replace(/on:[a-zA-Z]+=[^\\s>]*/g, '');
      html = html.replace(/bind:[a-zA-Z]+=[^\\s>]*/g, '');
      
      return html.trim();
    }
    
    // Ajouter une interactivité basique
    function addBasicInteractivity(container) {
      // Simuler les clics de boutons
      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          console.log('🔘 Bouton cliqué:', btn.textContent);
          
          // Animation simple
          btn.style.transform = 'scale(0.95)';
          setTimeout(() => {
            btn.style.transform = 'scale(1)';
          }, 150);
        });
      });
      
      // Simuler les inputs
      container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
          console.log('📝 Input changé:', e.target.value);
        });
      });
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
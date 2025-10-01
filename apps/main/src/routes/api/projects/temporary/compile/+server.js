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
 * Génère un HTML simple et propre pour l'aperçu (sans compilation complexe)
 * Extrait le contenu visible du composant Svelte principal
 */
function generateStandaloneHTML(svelteCode, allFiles) {
  // Extraire le CSS s'il existe
  const cssFile = allFiles['src/app.css'] || allFiles['app.css'] || '';
  const tailwindConfig = allFiles['tailwind.config.cjs'] || '';
  
  // Extraire le HTML du composant Svelte (entre les balises <script> et <style>)
  let htmlContent = svelteCode;
  
  // Supprimer les balises <script>
  htmlContent = htmlContent.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Supprimer les balises <style>
  htmlContent = htmlContent.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Nettoyer les directives Svelte pour un aperçu statique
  htmlContent = htmlContent
    .replace(/\{#if\s+.*?\}/g, '') // Supprimer {#if}
    .replace(/\{:else\}/g, '') // Supprimer {:else}
    .replace(/\{\/if\}/g, '') // Supprimer {/if}
    .replace(/\{#each\s+.*?\s+as\s+.*?\}/g, '<div class="repeated-item">') // Remplacer {#each}
    .replace(/\{\/each\}/g, '</div>') // Remplacer {/each}
    .replace(/\{@html\s+.*?\}/g, '[HTML dynamique]') // Remplacer {@html}
    .replace(/\{.*?\}/g, match => {
      // Garder certaines expressions simples, sinon placeholder
      if (match.includes('title') || match.includes('name')) {
        return '<span class="text-gray-600">[Contenu dynamique]</span>';
      }
      return '';
    })
    .replace(/on:[a-z]+\s*=\s*["{][^"}>]*["}>]/gi, '') // Supprimer on:click etc
    .replace(/bind:[a-z]+\s*=\s*["{][^"}>]*["}>]/gi, '') // Supprimer bind:
    .replace(/use:[a-z]+/gi, ''); // Supprimer use:
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperçu - Application générée</title>
  
  <!-- Tailwind CSS depuis CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    /* Reset */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      background: #f9fafb;
    }
    
    /* CSS du projet */
    ${cssFile}
    
    /* Style pour les items répétés */
    .repeated-item {
      margin-bottom: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    /* Bannière d'info */
    .preview-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.75rem;
      text-align: center;
      font-size: 0.875rem;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id="app">
    ${htmlContent}
  </div>
  
  <div class="preview-banner">
    ⚡ Aperçu statique de votre application Svelte • 
    <strong>Téléchargez le code</strong> pour un rendu complet avec interactivité
  </div>
  
  <script>
    // Ajouter un peu d'interactivité basique aux boutons
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = 'scale(1)';
        }, 100);
        console.log('Bouton cliqué:', this.textContent);
      });
    });
    
        });
    
    // Simuler des inputs
    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', function() {
        console.log('Input:', this.value);
      });
    });
  </script>
</body>
</html>`;
}

  </script>
</body>
</html>`;
}

    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}
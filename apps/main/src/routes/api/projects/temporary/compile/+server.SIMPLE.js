import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Compilateur SIMPLE et FIABLE pour preview temporaire
 * Input: { files: Record<string, string> }
 * Output: HTML standalone avec Skeleton UI
 */
export async function POST({ request }) {
  const t0 = Date.now();
  
  try {
    const body = await request.json();
    const { files } = body;
    
    if (!files || typeof files !== 'object') {
      return json({ success: false, error: 'files object required' }, { status: 400 });
    }
    
    // Trouver le fichier principal
    const mainFile = files['src/routes/+page.svelte'] || 
                     Object.keys(files).find(k => k.endsWith('+page.svelte')) ||
                     Object.keys(files).find(k => k.endsWith('.svelte'));
    
    if (!mainFile) {
      return json({ success: false, error: 'No Svelte file found' }, { status: 400 });
    }
    
    const svelteCode = files[mainFile];
    
    // Compiler le composant Svelte SIMPLEMENT
    const compiled = compile(svelteCode, {
      generate: 'dom',
      css: 'injected'
    });
    
    // HTML standalone avec Skeleton UI
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview - Constructor v3</title>
  
  <!-- Skeleton UI via CDN -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@skeletonlabs/skeleton@3/themes/theme-skeleton.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@skeletonlabs/skeleton@3/styles/all.css">
  
  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- FontAwesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    #app { width: 100%; min-height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>
  
  <script type="module">
    ${compiled.js.code}
    
    // Monter le composant
    try {
      new Component({ target: document.getElementById('app') });
      console.log('[Preview] App mounted successfully');
    } catch (error) {
      console.error('[Preview] Mount error:', error);
      document.getElementById('app').innerHTML = 
        '<div style="padding:20px;color:red;font-family:monospace;"><h2>❌ Erreur</h2><pre>' + 
        error.toString() + '</pre></div>';
    }
  </script>
</body>
</html>`;
    
    return json({
      success: true,
      runtimeHtml: html,
      timings: { total_ms: Date.now() - t0 }
    });
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
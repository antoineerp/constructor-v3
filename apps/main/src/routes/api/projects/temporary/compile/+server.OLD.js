import { json } from '@sveltejs/kit';
import { compile } from 'svelte/compiler';

export const config = { runtime: 'nodejs20.x' };

/**
 * POST /api/projects/temporary/compile
 * Compilation simple pour preview temporaire
 * Body: { files: Record<string,string>, entries?: string[], format?: 'html' }
 */
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { files, format = 'html' } = body;
    
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
    
    // Compiler le composant Svelte
    const compiled = compile(svelteCode, {
      generate: 'dom',
      hydratable: false,
      css: 'injected'
    });
    
    // Extraire le CSS Tailwind si présent
    const appCss = files['src/app.css'] || files['app.css'] || `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
    `;
    
    // Construire le HTML standalone
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>${appCss.replace(/@tailwind[^;]+;/g, '')}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    // Code Svelte compilé
    ${compiled.js.code}
    
    // Monter le composant
    new Component({
      target: document.getElementById('app')
    });
  <\/script>
</body>
</html>`;
    
    if (format === 'html') {
      return json({
        success: true,
        runtimeHtml: html,
        cached: false,
        timings: { total: 100 }
      });
    }
    
    return json({
      success: true,
      modules: [{
        path: mainFile,
        jsCode: compiled.js.code,
        css: compiled.css?.code
      }],
      entry: mainFile
    });
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({
      success: false,
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}

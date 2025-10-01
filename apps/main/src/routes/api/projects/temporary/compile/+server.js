import { json } from '@sveltejs/kit';

// Réutiliser la logique de compilation du projet existant
// mais pour des fichiers temporaires (pas persistés en DB)
import { POST as compileProject } from '../../[id]/compile/+server.js';

export const config = { runtime: 'nodejs20.x' };

// POST /api/projects/temporary/compile
// Body: { files: Record<string,string>, entries?: string[] }
// Utilise la même logique que le compilateur de projet standard
export async function POST(event) {
  const { request } = event;
  
  try {
    const body = await request.json();
    const { files, entries = [] } = body;
    
    if (!files || typeof files !== 'object') {
      return json({ success: false, error: 'Fichiers requis' }, { status: 400 });
    }

    // Créer un événement simulé pour réutiliser la logique existante
    const mockEvent = {
      params: { id: 'temporary' },
      request: new Request(request.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          files, 
          entries,
          external: false // Mode local avec data URLs
        })
      }),
      locals: {} // Pas d'authentification pour temporaire
    };

    // Appeler directement la fonction de compilation existante
    return await compileProject(mockEvent);
    
  } catch (error) {
    console.error('[temporary/compile] Error:', error);
    return json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
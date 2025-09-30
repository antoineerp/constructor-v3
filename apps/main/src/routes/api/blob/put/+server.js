import { json } from '@sveltejs/kit';
import { put } from '@vercel/blob';

// Simple proxy pour stocker un contenu généré (ex: résultat de preview) sur Vercel Blob
// Body attendu: { path?: string, content: string, contentType?: string }
export async function POST({ request }) {
  try {
    const { content, path = 'previews/' + Date.now() + '.html', contentType = 'text/html' } = await request.json();
    if(!content) return json({ success:false, error:'content manquant' }, { status:400 });
    const blob = await put(path, content, { contentType, addRandomSuffix: false, access: 'public' });
    return json({ success:true, url: blob.url, pathname: blob.pathname, size: blob.size });
  } catch(e){
    return json({ success:false, error: e.message }, { status:500 });
  }
}

import { json } from '@sveltejs/kit';

// Supabase removed - File upload disabled
// Files are handled client-side only (data URLs, localStorage)

export async function POST() {
  return json({ 
    success: false, 
    error: 'File upload disabled - using client-side storage only',
    hint: 'Files are stored as data URLs in browser localStorage'
  }, { status: 501 }); // 501 Not Implemented
}

import { json } from '@sveltejs/kit';

// Supabase removed - Vision analysis client-side only

export async function POST() {
  return json({ 
    success: false, 
    error: 'Vision analysis requires OpenAI API key',
    hint: 'Use /api/files/analyze with pre-processed data'
  }, { status: 501 });
}

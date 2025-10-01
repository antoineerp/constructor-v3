import { json } from '@sveltejs/kit';

// Supabase removed - Analysis cache in-memory only

const analysesCache = new Map();

export async function POST({ request }) {
  try {
    const { hash, kind, analysis } = await request.json();
    
    if (!hash || !analysis) {
      return json({ success: false, error: 'hash and analysis required' }, { status: 400 });
    }
    
    // Store in memory cache (lost on restart, but acceptable for MVP)
    analysesCache.set(hash, { hash, kind, analysis, created_at: new Date().toISOString() });
    
    return json({ success: true, hash, stored: 'memory' });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET({ url }) {
  const hash = url.searchParams.get('hash');
  
  if (!hash) {
    return json({ success: false, error: 'hash parameter required' }, { status: 400 });
  }
  
  const cached = analysesCache.get(hash);
  
  if (!cached) {
    return json({ success: false, error: 'Analysis not found' }, { status: 404 });
  }
  
  return json({ success: true, analysis: cached });
}

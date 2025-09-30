import { error, text } from '@sveltejs/kit';

// GET /runtime/* -> sert les bundles compilés stockés en mémoire par /api/compile/dom
// Ajout TTL & cleanup
const TTL_MS = 5 * 60 * 1000; // 5 minutes
if(typeof globalThis.__RUNTIME_BUNDLES_META === 'undefined') globalThis.__RUNTIME_BUNDLES_META = new Map();
if(typeof globalThis.__RUNTIME_BUNDLES_CLEANED === 'undefined') globalThis.__RUNTIME_BUNDLES_CLEANED = 0;
function cleanup(){
  const now = Date.now();
  if(globalThis.__RUNTIME_BUNDLES_CLEANED && now - globalThis.__RUNTIME_BUNDLES_CLEANED < 60000) return; // 1 min throttle
  globalThis.__RUNTIME_BUNDLES_CLEANED = now;
  const map = globalThis.__RUNTIME_BUNDLES;
  const meta = globalThis.__RUNTIME_BUNDLES_META;
  if(!map) return;
  for(const [k,v] of meta.entries()){
    if(now - v.t > TTL_MS){ map.delete(k); meta.delete(k); }
  }
}

export async function GET(event){
  const { params } = event;
  const rel = params.path || '';
  const fullPath = `/runtime/${rel}`;
  if(typeof globalThis.__RUNTIME_BUNDLES === 'undefined'){
    throw error(404, 'Runtime cache vide');
  }
  cleanup();
  const code = globalThis.__RUNTIME_BUNDLES.get(fullPath);
  if(!code){
    throw error(404, 'Bundle introuvable');
  }
  // Rafraîchir meta
  globalThis.__RUNTIME_BUNDLES_META.set(fullPath, { t: Date.now() });
  return text(code, { headers:{ 'Content-Type':'application/javascript', 'Cache-Control':'no-store' } });
}

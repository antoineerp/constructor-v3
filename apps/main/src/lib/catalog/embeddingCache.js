// Simple in-memory embedding cache (non persistant). Could be replaced by DB table later.
const _cache = new Map(); // key -> Float32Array (as array)

export function getEmbeddingCache(key){
  return _cache.get(key);
}
export function setEmbeddingCache(key, embedding){
  _cache.set(key, embedding);
}

export function cosineSim(a, b){
  if(!a || !b || a.length !== b.length) return 0;
  let dot=0, na=0, nb=0;
  for(let i=0;i<a.length;i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) || 1);
}

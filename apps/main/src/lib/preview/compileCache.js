import crypto from 'crypto';

// Cache en mémoire pour résultats de compilation
// key = hash global (contenu fichiers + options)
const cache = new Map();

export function computeProjectHash(files, options={}){
  const hash = crypto.createHash('sha256');
  const keys = Object.keys(files).sort();
  hash.update('v1');
  for(const k of keys){
    hash.update(k); hash.update('\n'); hash.update(files[k]); hash.update('\n');
  }
  hash.update(JSON.stringify(options));
  return hash.digest('hex').slice(0,48);
}

export function computeFileHash(path, content, options={}){
  const hash = crypto.createHash('sha256');
  hash.update('f1');
  hash.update(path); hash.update('\n');
  hash.update(content||'');
  hash.update(JSON.stringify(options));
  return hash.digest('hex').slice(0,48);
}

export function getCached(hash){
  const entry = cache.get(hash);
  if(!entry) return null;
  if(entry.expires && entry.expires < Date.now()) { cache.delete(hash); return null; }
  return entry.value;
}

export function setCached(hash, value, ttlMs = 5*60*1000){
  cache.set(hash, { value, expires: Date.now()+ttlMs });
}

export function stats(){ return { size: cache.size }; }

// Cache en mémoire ultra simple (clé -> { value, expiresAt })
// Peut être remplacé ultérieurement par une table Supabase (ai_cache) avec colonnes: key, value(json), expires_at.

const store = new Map();

function nowSec(){ return Math.floor(Date.now()/1000); }

export const simpleCache = {
  key(namespace, obj){
    const base = JSON.stringify(obj||{});
    const hash = Array.from(new TextEncoder().encode(base)).reduce((a,b)=> (a*31 + b) % 1_000_000_007, 7).toString(36);
    return `${namespace}:${hash}`;
  },
  get(k){
    const entry = store.get(k);
    if(!entry) return null;
    if(entry.expiresAt < nowSec()){ store.delete(k); return null; }
    return entry.value;
  },
  set(k, value, ttlSeconds=600){
    store.set(k, { value, expiresAt: nowSec() + ttlSeconds });
  },
  purge(){
    const t = nowSec();
    for(const [k,v] of store.entries()) if(v.expiresAt < t) store.delete(k);
  },
  stats(){ return { size: store.size }; }
};

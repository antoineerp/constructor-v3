// Utilitaires catalogue: déduplication et hashing simple
export function dedupeComponents(list){
  const seen = new Map(); // key: name|filename -> component
  for(const c of list){
    const key = (c.name+'|'+c.filename).toLowerCase();
    if(!seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

export function lightweightHash(code){
  // Non cryptographique – juste pour détecter doublons approximatifs
  let h = 0, i, chr;
  if(!code) return '0';
  for(i=0;i<code.length;i++){ chr = code.charCodeAt(i); h = (h<<5)-h + chr; h |= 0; }
  return 'h'+(h>>>0).toString(16);
}

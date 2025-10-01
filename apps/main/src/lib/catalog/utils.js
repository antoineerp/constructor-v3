// Centralisation des fonctions de déduplication et de hachage
export function dedupeComponents(list) {
  const seen = new Map();
  for (const c of list) {
    const key = `${c.name}|${c.filename}`.toLowerCase();
    if (!seen.has(key)) seen.set(key, c);
  }
  return Array.from(seen.values());
}

export function lightweightHash(code) {
  let h = 0;
  if (!code) return '0';
  for (let i = 0; i < code.length; i++) {
    const chr = code.charCodeAt(i);
    h = (h << 5) - h + chr;
    h |= 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}

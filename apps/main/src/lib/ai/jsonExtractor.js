// Utilitaire d'extraction/parse JSON robuste pour les réponses IA.
// Stratégie:
// 1. Tentative parse direct
// 2. Délimiteurs personnalisés <<<JSON_START>>> ... <<<JSON_END>>>
// 3. Scan équilibrage accolades (recherche plus grand bloc plausible)
// 4. Nettoyage fences markdown accidentels
// 5. Retourne { ok, data?, error?, rawFragment }

export function extractJson(raw, { allowArrays = true } = {}) {
  if (raw == null) return { ok: false, error: 'Réponse vide', rawFragment: '' };
  let text = String(raw).trim();
  const original = text;

  // Nettoyage fences
  text = text.replace(/^```(json)?\s*/i, '').replace(/```\s*$/,'').trim();

  // Délimiteurs explicites
  const startMarker = '<<<JSON_START>>>';
  const endMarker = '<<<JSON_END>>>';
  if (text.includes(startMarker) && text.includes(endMarker)) {
    const inner = text.substring(text.indexOf(startMarker)+startMarker.length, text.lastIndexOf(endMarker)).trim();
    const parsed = tryParse(inner, allowArrays);
    if (parsed.ok) return { ...parsed, rawFragment: inner };
  }

  // Tentative direct
  let direct = tryParse(text, allowArrays);
  if (direct.ok) return { ...direct, rawFragment: text };

  // Extraire plus grand bloc équilibré {}
  const braceResult = extractBalancedBraces(text);
  if (braceResult.fragment) {
    const parsed = tryParse(braceResult.fragment, allowArrays);
    if (parsed.ok) return { ...parsed, rawFragment: braceResult.fragment };
  }

  return { ok: false, error: direct.error || 'Impossible d\'extraire JSON', rawFragment: original.slice(0,4000) };
}

function tryParse(str, allowArrays){
  try {
    const data = JSON.parse(str);
    if (!allowArrays && Array.isArray(data)) return { ok:false, error:'Un objet JSON était attendu (pas un tableau).' };
    if (typeof data !== 'object' || data === null) return { ok:false, error:'Structure JSON inattendue.' };
    return { ok:true, data };
  } catch(e){
    return { ok:false, error: e.message };
  }
}

function extractBalancedBraces(text){
  let best = ''; let depth=0; let current=''; let started=false;
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (ch === '{') { depth++; started = true; current += ch; }
    else if (ch === '}') { if(started){ depth--; current += ch; if (depth===0){ if(current.length > best.length) best = current; current=''; started=false; } } }
    else if (started) { current += ch; }
  }
  return { fragment: best.trim() };
}

// Helper pour marquer un prompt d'enveloppe JSON
export function withJsonEnvelope(instructions){
  return `${instructions}\nRespecte STRICTEMENT le format:\n<<<JSON_START>>>\n{ ... }\n<<<JSON_END>>>`;
}

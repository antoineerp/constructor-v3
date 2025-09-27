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

  // Suppression de bruit éventuel avant la 1ère accolade
  const firstBrace = text.indexOf('{');
  if(firstBrace > 0 && firstBrace < 400){ // si peu de bruit, on coupe
    const pre = text.slice(0, firstBrace);
    if(/<<<JSON_ST|^Here|^Output|^Réponse|^Result/i.test(pre)){
      text = text.slice(firstBrace);
    }
  }

  // Délimiteurs explicites
  const startMarker = '<<<JSON_START>>>';
  const endMarker = '<<<JSON_END>>>';
  if (text.includes(startMarker) && text.includes(endMarker)) {
    const inner = text.substring(text.indexOf(startMarker)+startMarker.length, text.lastIndexOf(endMarker)).trim();
    const parsed = tryParse(inner, allowArrays);
    if (parsed.ok) return { ...parsed, rawFragment: inner };
  }
  // Marqueur partiel (ex: tronqué) -> tenter entre première '{' et dernière '}'
  if(text.includes('<<<JSON_ST') && !text.includes('<<<JSON_END>>>')){
    const fb = text.indexOf('{');
    const lb = text.lastIndexOf('}');
    if(fb !== -1 && lb !== -1 && lb > fb){
      const slice = text.slice(fb, lb+1);
      const parsed = tryParse(slice, allowArrays);
      if(parsed.ok) return { ...parsed, rawFragment: slice };
    }
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
    // Première tentative brute
    try {
      const data = JSON.parse(str);
      if (!allowArrays && Array.isArray(data)) return { ok:false, error:'Un objet JSON était attendu (pas un tableau).' };
      if (typeof data !== 'object' || data === null) return { ok:false, error:'Structure JSON inattendue.' };
      return { ok:true, data };
    } catch(inner){
      // Réparation ciblée des séquences d'échappement invalides (ex: \_, \ , \X inattendu)
      const repaired = repairEscapes(str);
      if (repaired !== str){
        try {
          const data2 = JSON.parse(repaired);
          if (!allowArrays && Array.isArray(data2)) return { ok:false, error:'Un objet JSON était attendu (pas un tableau).' };
          if (typeof data2 !== 'object' || data2 === null) return { ok:false, error:'Structure JSON inattendue.' };
          return { ok:true, data: data2 };
        } catch(inner2){
          return { ok:false, error: inner2.message };
        }
      }
      return { ok:false, error: inner.message };
    }
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

// Tente de corriger des séquences d'échappement invalides fréquentes produites par le modèle.
// Stratégies:
// 1. Remplacer les backslashes isolés avant caractères non reconnus par double échappement (\\) ou retrait.
// 2. Corriger \_ -> _ (souvent un artefact Markdown) ou \- -> -.
// 3. Échapper les guillemets non échappés à l'intérieur de chaînes détectées heuristiquement si cela casse la parité.
function repairEscapes(input){
  let out = input;
  // Remplacements simples d'artefacts Markdown
  out = out.replace(/\\([_-])/g, '$1');
  // Backslash suivi d'espace ou fin de ligne -> retirer backslash
  out = out.replace(/\\(\s)/g, '$1');
  // Backslash devant un caractère alphanumérique qui n'est pas une séquence JSON valide -> supprimer backslash
  out = out.replace(/\\([A-Za-z0-9])(?![\\"\/bfnrtu0-9A-Fa-f])/g, '$1');
  // Séquences \" correctes on ne touche pas. Mais détecter \” typographiques et les normaliser
  out = out.replace(/\\[“”]/g, '"');
  // Corriger guillemets courbes non échappés
  out = out.replace(/[“”]/g, '"');
  // Vérifier équilibre global des quotes: si impair, tenter d'échapper les quotes internes non précédées d'un backslash dans des segments suspects
  const quoteCount = (out.match(/"/g) || []).length;
  if (quoteCount % 2 === 1){
    // Heuristique: remplacer "? dans : "value"value" -> insérer backslash avant deuxième
    out = out.replace(/:(\s*)"([^"\\]*?)"([^,}\n"])/g, (_m, ws, val, tail) => `:${ws}"${val}\\"${tail}`);
  }
  return out;
}

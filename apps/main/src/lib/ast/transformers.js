import MagicString from 'magic-string';

/* Utilitaires de transformations ciblées sur du code Svelte.
   Approche heuristique (sans parser Svelte complet) pour exemples simples. */

export function addMissingImgAlt(code){
  // Ajoute alt="" si <img ...> sans alt.
  const imgRegex = /<img\b[^>]*>/g;
  let modified = false;
  const ms = new MagicString(code);
  let match;
  while((match = imgRegex.exec(code))){
    const tag = match[0];
    if(/\balt\s*=/.test(tag)) continue;
    const insertPos = match.index + tag.length - 1; // avant '>'
    ms.appendLeft(insertPos, ' alt=""');
    modified = true;
  }
  return { code: modified? ms.toString(): code, modified };
}

export function normalizeSvelteImports(code){
  // Exemple: supprime imports en doublon exacts
  const lines = code.split('\n');
  const seen = new Set();
  let modified=false;
  for(let i=0;i<lines.length;i++){
    const l = lines[i];
    if(/^import\s+.+from\s+['"].+['"];?\s*$/.test(l)){
      if(seen.has(l.trim())){ lines[i] = ''; modified=true; }
      else seen.add(l.trim());
    }
  }
  if(!modified) return { code, modified:false };
  return { code: lines.join('\n'), modified:true };
}

export function runAllTransforms(code){
  let current = code; const notes=[];
  const t1 = addMissingImgAlt(current); if(t1.modified){ current=t1.code; notes.push('added img alt'); }
  const t2 = normalizeSvelteImports(current); if(t2.modified){ current=t2.code; notes.push('normalized imports'); }
  return { code: current, notes };
}

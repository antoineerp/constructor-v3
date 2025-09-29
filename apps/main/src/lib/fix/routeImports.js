// Utilitaire d'auto-fix des imports de routes (+page/+layout) interdits.
// Stratégie: remplacer chaque import de route par un composant extrait dans src/lib/Extracted/.
// Retour: { files: nouvelleMap, created: string[], changes: [{file,fixed}], count }

export function fixRouteImports(originalFiles){
  const files = { ...originalFiles };
  const created = {};
  const changes = [];
  const importRe = /import\s+([^;]+?)from\s+['"]([^'"\n]+)['"];?/g;
  function makeComponentName(spec){
    const base = spec.split('/').filter(Boolean).slice(-2).join('-').replace(/\+page\.svelte|\+layout\.svelte/,'')||'Part';
    return base.split(/[^A-Za-z0-9]/).filter(Boolean).map(s=> s[0].toUpperCase()+s.slice(1)).join('')+ 'Content';
  }
  for(const [fname, code] of Object.entries(originalFiles)){
    if(!fname.endsWith('.svelte')) continue;
    let mutated = code; let matched = false; let m;
    importRe.lastIndex = 0;
    while((m = importRe.exec(code))){
      const spec = m[2];
      if(/\+page\.svelte$/.test(spec) || /\+layout\.svelte$/.test(spec)){
        matched = true;
        const compName = makeComponentName(spec);
        const newPath = `src/lib/Extracted/${compName}.svelte`;
        if(!created[newPath]){
          created[newPath] = `<script>export let children;<\/script>\n<div class=\"extracted-route-block border border-dashed p-4 rounded\">\n  <p class=\"text-xs text-gray-500\">Extrait de ${spec} (isolé).\n  </p>{#if children}<slot/>{/if}\n</div>`;
        }
        const importStmt = m[0];
        mutated = mutated.replace(importStmt, `import ${compName} from '$lib/Extracted/${compName}.svelte';`);
      }
    }
    if(matched){
      files[fname] = mutated;
      changes.push({ file: fname, fixed: true });
    }
  }
  Object.assign(files, created);
  return { files, created: Object.keys(created), changes, count: changes.length };
}
